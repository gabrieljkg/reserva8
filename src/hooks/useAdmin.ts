import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const ADMIN_EMAILS = ['gabrielcalid@gmail.com', 'francisconogueiradir@gmail.com'];

export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email?.toLowerCase() || '';
      setIsAdmin(ADMIN_EMAILS.includes(userEmail));
      setLoading(false);
    };

    checkAdmin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const userEmail = session?.user?.email?.toLowerCase() || '';
      setIsAdmin(ADMIN_EMAILS.includes(userEmail));
    });

    return () => subscription.unsubscribe();
  }, []);

  return { isAdmin, loading };
};
