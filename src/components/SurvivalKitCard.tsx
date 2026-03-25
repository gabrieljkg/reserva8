import React from 'react';
import { SurvivalKit } from '../data/mockData';
import { Plus } from 'lucide-react';

interface Props {
  kit: SurvivalKit;
  key?: string | number;
}

export const SurvivalKitCard = ({ kit }: Props) => {
  return (
    <div className="bg-white p-8 border border-ink/5 hover:border-ink/20 transition-all group">
      <div className="aspect-square overflow-hidden mb-8">
        <img 
          src={kit.image} 
          alt={kit.name} 
          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
          referrerPolicy="no-referrer"
        />
      </div>
      <h3 className="text-xl mb-2">{kit.name}</h3>
      <p className="text-xs text-ink/60 mb-6 h-12 overflow-hidden">
        {kit.description}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-lg font-serif italic">${kit.price}</span>
        <button className="w-10 h-10 rounded-full border border-ink flex items-center justify-center hover:bg-ink hover:text-paper transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
