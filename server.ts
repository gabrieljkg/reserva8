import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  console.warn("⚠️ AVISO: MERCADOPAGO_ACCESS_TOKEN não foi encontrado nas variáveis de ambiente.");
}
if (!process.env.MERCADOPAGO_PUBLIC_KEY) {
  console.warn("⚠️ AVISO: MERCADOPAGO_PUBLIC_KEY não foi encontrado nas variáveis de ambiente.");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Mercado Pago configuration
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "APP_USR-3698176114384770-032512-5513487a68acc795acd760e7c4081e9c-3291617759",
  options: {
    testToken: true
  }
});

// Helper to get clean APP_URL
const getAppUrl = () => {
  const url = process.env.APP_URL || "";
  return url.endsWith("/") ? url.slice(0, -1) : url;
};

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

app.use(express.json());

// API routes
app.post("/api/create-preference", async (req, res) => {
  try {
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado.");
    }

    const { items, totalAmount, paymentMethodId, payer, bookingData } = req.body;
    const appUrl = getAppUrl();

    console.log(`Creating preference/payment for booking, amount: ${totalAmount}, method: ${paymentMethodId}`);
    console.log(`Request body received:`, JSON.stringify(req.body, null, 2));

    let bookingId = req.body.bookingId;

    // Se a reserva ainda não foi criada, cria no backend
    if (!bookingId && bookingData) {
      try {
        const payload = {
          user_id: bookingData.user_id,
          destination_id: bookingData.destination_id,
          check_in: bookingData.check_in,
          check_out: bookingData.check_out,
          total_price: Number(bookingData.total_price),
          commission_rate: 0.20,
          platform_fee: Number(bookingData.total_price) * 0.20,
          owner_payout: Number(bookingData.total_price) * 0.80,
          payment_method: paymentMethodId === 'bolbradesco' ? 'boleto' : paymentMethodId,
          guest_name: payer?.name || 'Guest',
          guest_email: payer?.email || 'test_user_12345@testuser.com',
          guest_phone: bookingData.guest_phone || '',
          guest_cpf: payer?.cpf || '',
          status: 'pending',
          payment_status: 'pending'
        };

        console.log("Tentando inserir reserva com os seguintes dados:", JSON.stringify(payload, null, 2));

        const { data: newBooking, error: insertError } = await supabase
          .from('bookings')
          .insert([payload])
          .select()
          .single();

        if (insertError) {
          console.error("================ ERRO DE VALIDAÇÃO NO BANCO ================");
          console.error("Código do erro:", insertError.code);
          console.error("Mensagem:", insertError.message);
          console.error("Detalhes:", insertError.details);
          console.error("Dica:", insertError.hint);
          console.error("============================================================");
          throw new Error(`Erro ao criar reserva no banco: ${insertError.message} - ${insertError.details || ''}`);
        }
        
        bookingId = newBooking.id;
        console.log('Reserva criada com sucesso no backend:', newBooking);
      } catch (dbError: any) {
        console.error("Exceção ao tentar inserir reserva no banco:", dbError);
        return res.status(400).json({ error: dbError.message || "Erro ao criar reserva no banco de dados", details: dbError });
      }
    }

    if (!bookingId) {
      throw new Error("ID da reserva não fornecido e dados da reserva ausentes.");
    }

    if (paymentMethodId === 'pix' || paymentMethodId === 'bolbradesco') {
      const payment = new Payment(client);
      const result = await payment.create({
        body: {
          transaction_amount: Number(totalAmount),
          description: `Reserva - ${payer?.name || 'Guest'}`,
          payment_method_id: paymentMethodId,
          metadata: {
            booking_id: bookingId
          },
          notification_url: `${appUrl}/api/webhook/mercadopago`,
          payer: {
            email: 'test_user_12345@testuser.com', // Hardcoded to avoid seller email conflict in sandbox
            first_name: payer?.name?.split(" ")[0] || "Guest",
            last_name: payer?.name?.split(" ").slice(1).join(" ") || "User",
            identification: {
              type: "CPF",
              number: (payer?.cpf || "").replace(/\D/g, ""),
            },
          },
        },
      });

      console.log(`Payment created: ${result.id}, status: ${result.status}`);
      return res.json({
        id: result.id,
        status: result.status,
        qr_code: result.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
        ticket_url: result.transaction_details?.external_resource_url,
      });
    } else {
      const preference = new Preference(client);
      const result = await preference.create({
        body: {
          purpose: 'wallet_purchase',
          payer: {
            email: 'test_user_12345@testuser.com', // Hardcoded to avoid seller email conflict in sandbox
            name: payer?.name || 'Guest',
          },
          items: [
            {
              id: bookingId || "booking",
              title: `Reserva - ${payer?.name || 'Guest'}`,
              unit_price: Number(totalAmount),
              quantity: 1,
              currency_id: "BRL",
            }
          ],
          payment_methods: {
            excluded_payment_methods: [],
            excluded_payment_types: [],
          },
          metadata: {
            booking_id: bookingId
          },
          back_urls: {
            success: `${appUrl}/sucesso?status=approved`,
            failure: `${appUrl}/sucesso?status=failure`,
            pending: `${appUrl}/sucesso?status=pending`,
          },
          auto_return: "approved",
          notification_url: `${appUrl}/api/webhook/mercadopago`,
        },
      });

      // Since we are forcing sandbox mode with testToken: true, we should use sandbox_init_point
      const checkoutUrl = result.sandbox_init_point || result.init_point;

      console.log(`Preference created: ${result.id}, init_point: ${checkoutUrl}`);
      return res.json({ 
        id: result.id, 
        init_point: checkoutUrl,
        qr_code: (result as any).point_of_interaction?.transaction_data?.qr_code,
        ticket_url: (result as any).transaction_details?.external_resource_url
      });
    }
  } catch (error: any) {
    console.error("Error creating preference/payment:", JSON.stringify(error, null, 2));
    console.error("Error details:", error);
    res.status(500).json({ error: error.message || "Erro interno ao criar preferência", details: error });
  }
});



app.post("/api/webhook/mercadopago", async (req, res) => {
  const { query, body } = req;
  const topic = query.topic || query.type || body.type;
  const action = body.action;

  console.log("Webhook received:", { topic, action, query, body });

  if (topic === "payment" || action === "payment.updated" || action === "payment.created") {
    const paymentId = query.id || query["data.id"] || body.data?.id;
    
    if (!paymentId) {
      console.error("No payment ID found in webhook payload.");
      return res.sendStatus(400);
    }

    try {
      const payment = new Payment(client);
      const paymentData = await payment.get({ id: String(paymentId) });

      console.log(`Payment ${paymentId} status: ${paymentData.status}`);

      if (paymentData.status === "approved") {
        const metadata = paymentData.metadata;
        
        const bookingId = metadata?.booking_id;

        if (bookingId) {
          console.log(`Payment approved for booking ${bookingId}. Updating record...`);

          const { error } = await supabase
            .from("bookings")
            .update({
              status: "confirmed",
              payment_status: "paid",
              payment_id: String(paymentId),
            })
            .eq("id", bookingId);

          if (error) {
            console.error("Error updating booking from webhook:", error);
          } else {
            console.log(`Booking ${bookingId} updated successfully for payment ${paymentId}.`);
          }
        } else {
          console.warn("No booking_id found in payment metadata.");
        }
      }
    } catch (error) {
      console.error("Error processing payment webhook:", error);
    }
  }

  res.sendStatus(200);
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
