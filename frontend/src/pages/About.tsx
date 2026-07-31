import React from 'react';
import { SEO } from '../components/SEO';
import { useCMS } from '../context/CMSContext';
import { motion } from 'framer-motion';
import { 
  Heart, Target, Compass, Award, ShieldCheck, 
  Users, Sparkles, Sprout 
} from 'lucide-react';
import { Linkedin } from '../components/BrandIcons';

export const About: React.FC = () => {
  const { seoSettings } = useCMS();

  const seo = seoSettings.about || {
    title: 'Our Story & Vision | FreshCart Groceries',
    description: 'Learn about FreshCart mission to bring fresh organic farm products directly to your doorstep. Explore our leadership, milestones, and core values.',
    keywords: 'about freshcart, local farming sustainable, freshcart timeline'
  };

  const timelineData = [
    { year: '2023', title: 'The Germination', desc: 'FreshCart was founded in Bengaluru with a simple idea: bypass multi-layered retail storage chains and deliver vegetables directly from farms within 30 minutes.' },
    { year: '2024', title: 'Series A Funding', desc: 'Raised $15M from leading tech investors. Expanded our express dark store infrastructure to cover 5 major tech corridors in South Bengaluru.' },
    { year: '2025', title: 'Organic Partnership', desc: 'Partnered with over 450 certified organic farming cooperatives. Launched our VIP Super Saver program which enrolled 10,000+ members in 3 months.' },
    { year: '2026', title: 'Going Green', desc: 'Transitioned 100% of our packaging to biodegradable crop starch containers and added electric delivery scooters across our distribution hubs.' }
  ];

  const leaders = [
    { name: 'Dr. Rohan Murthy', role: 'Co-Founder & CEO', bio: 'Former retail operations director with 15+ years in agricultural supply-chain optimization.', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop' },
    { name: 'Aditi Rao', role: 'Co-Founder & COO', bio: 'Logistics expert who scaled hyper-local delivery grids across 3 unicorn startups.', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop' },
    { name: 'Marcus Green', role: 'Head of Quality', bio: 'Certified auditor managing compliance metrics across all cooperative member farms.', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop' }
  ];

  return (
    <div className="page-wrapper">
      <SEO 
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
      />

      <div className="container mx-auto px-4 md:px-6 max-w-[1280px] py-8 pb-16">
        {/* Title Header */}
        <section className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-extrabold mb-3 text-text-primary"
          >
            Revolutionizing Hyperlocal Groceries
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-text-secondary"
          >
            We connect organic local growers directly to your kitchen.
          </motion.p>
        </section>

        {/* Our Story */}
        <section className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 items-center mb-16">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col gap-4"
          >
            <h2 className="text-3xl font-extrabold text-text-primary">Our Story</h2>
            <p className="text-base text-text-secondary leading-relaxed">
              In early 2023, FreshCart was born out of frustration. Buying fresh vegetables in urban centers meant picking between wilted supermarket stock stored in chemical coolers or local carts exposed to street dust.
            </p>
            <p className="text-base text-text-secondary leading-relaxed">
              We realized that the secret lay in the timeline. By partnering directly with agricultural cooperatives around Hosur and outer Bengaluru, we established a pipeline where crops harvested at 4:00 AM are graded, packed, and placed in our hyperlocal dark-store hubs by 7:00 AM—ready to reach your door in 15-30 minutes.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl overflow-hidden shadow-premium aspect-[4/3]"
          >
            <img 
              src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&auto=format&fit=crop" 
              alt="Organic farm harvesting at dawn" 
              className="w-full h-full object-cover" 
            />
          </motion.div>
        </section>

        {/* Vision & Mission */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <motion.div 
            className="bg-surface p-6 rounded-2xl border border-divider shadow-card flex flex-col gap-3 transition-transform duration-200 hover:-translate-y-1"
            whileHover={{ y: -5 }}
          >
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-2">
              <Target size={24} />
            </div>
            <h3 className="text-xl font-extrabold text-text-primary">Our Mission</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              To make high-quality, 100% chemical-free organic groceries accessible to urban households, supporting local agricultural growers and promoting ecological carbon balances.
            </p>
          </motion.div>

          <motion.div 
            className="bg-surface p-6 rounded-2xl border border-divider shadow-card flex flex-col gap-3 transition-transform duration-200 hover:-translate-y-1"
            whileHover={{ y: -5 }}
          >
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-2">
              <Compass size={24} />
            </div>
            <h3 className="text-xl font-extrabold text-text-primary">Our Vision</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              To scale a zero-emissions logistics network across 20 metro cities in India, becoming the most trusted and transparent farm-to-fork e-grocery platform.
            </p>
          </motion.div>
        </section>

        {/* Core Values */}
        <section className="mb-16">
          <h2 className="text-center text-3xl font-extrabold mb-10 text-text-primary">Our Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-surface p-6 rounded-2xl border border-divider shadow-card flex items-center gap-4 transition-transform duration-200 hover:-translate-y-1">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center flex-shrink-0"><Sprout size={24} /></div>
              <div>
                <h4 className="font-bold text-text-primary text-base">Absolute Freshness</h4>
                <p className="text-xs text-text-secondary mt-1 leading-normal">Never stored in coolers for days. Sourced daily and delivered at peak nutritional values.</p>
              </div>
            </div>
            <div className="bg-surface p-6 rounded-2xl border border-divider shadow-card flex items-center gap-4 transition-transform duration-200 hover:-translate-y-1">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center flex-shrink-0"><ShieldCheck size={24} /></div>
              <div>
                <h4 className="font-bold text-text-primary text-base">100% Transparency</h4>
                <p className="text-xs text-text-secondary mt-1 leading-normal">We trace every organic batch back to the cooperative and show lab test results on demand.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="mb-16 relative">
          <h2 className="text-center text-3xl font-extrabold mb-10 text-text-primary">Company Milestones</h2>
          
          <div className="relative max-w-[800px] mx-auto before:content-[''] before:absolute before:w-[2px] before:bg-divider before:top-0 before:bottom-0 before:left-[20px] md:before:left-1/2 before:-ml-[1px]">
            {timelineData.map((item, idx) => {
              const isLeft = idx % 2 === 0;
              return (
                <motion.div 
                  key={idx}
                  className={`pl-10 pr-0 md:px-10 py-3 relative bg-transparent w-full md:w-1/2 ${
                    isLeft 
                      ? 'left-0 md:text-right md:pr-10 md:pl-0' 
                      : 'left-0 md:left-1/2 md:pl-10 md:pr-0'
                  }`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                >
                  {/* Dot indicator */}
                  <div className={`absolute w-4 h-4 bg-surface border-3 border-primary rounded-full z-10 top-[26px] ${
                    isLeft 
                      ? 'left-[12px] md:left-auto md:-right-[9px]' 
                      : 'left-[12px] md:-left-[9px]'
                  }`} />
                  
                  <div className="p-5 bg-surface rounded-lg border border-divider shadow-card">
                    <div className="text-lg font-extrabold text-primary mb-1.5">{item.year}</div>
                    <div className="font-bold text-text-primary text-sm mb-1">{item.title}</div>
                    <p className="text-xs text-text-secondary leading-normal">{item.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Leadership */}
        <section>
          <h2 className="text-center text-3xl font-extrabold mb-10 text-text-primary">Our Leadership</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {leaders.map((leader, idx) => (
              <motion.div 
                key={idx}
                className="bg-surface rounded-2xl border border-divider overflow-hidden shadow-card transition-transform duration-200 hover:-translate-y-1"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <img src={leader.avatar} alt={leader.name} className="w-full aspect-[4/3] object-cover" />
                <div className="p-6 text-center flex flex-col gap-1.5 relative">
                  <h3 className="text-lg font-bold text-text-primary">{leader.name}</h3>
                  <span className="text-xs text-text-secondary">{leader.role}</span>
                  <p className="text-xs text-text-secondary leading-relaxed mt-1.5">{leader.bio}</p>
                  <a href="#" className="text-text-secondary hover:text-[#0077B5] transition-colors mt-2 flex items-center justify-center" aria-label={`${leader.name} LinkedIn Profile`}>
                    <Linkedin size={18} />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
