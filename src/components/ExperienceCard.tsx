import React from 'react';
import { motion } from 'motion/react';
import { Experience } from '../data/mockData';

interface Props {
  experience: Experience;
  key?: string | number;
}

export const ExperienceCard = ({ experience }: Props) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center border-b border-ink/10 py-12 last:border-0">
      <div className="relative aspect-video overflow-hidden">
        <img 
          src={experience.image} 
          alt={experience.title} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4 bg-ink text-paper px-4 py-1 text-[10px] uppercase tracking-widest">
          {experience.category}
        </div>
      </div>
      
      <div>
        <span className="text-[10px] uppercase tracking-[0.2em] opacity-50 mb-4 block">
          Guiado por {experience.instructor}
        </span>
        <h3 className="text-3xl mb-4">{experience.title}</h3>
        <p className="text-sm text-ink/70 leading-relaxed mb-8 max-w-md">
          {experience.description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-serif italic">${experience.price}</span>
          <button className="px-8 py-3 border border-ink text-[10px] uppercase tracking-widest hover:bg-ink hover:text-paper transition-colors">
            Reservar Vaga
          </button>
        </div>
      </div>
    </div>
  );
};
