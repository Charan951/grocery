import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCMS } from '../context/CMSContext';
import { SEO } from '../components/SEO';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BookOpen, Clock } from 'lucide-react';

export const Blog: React.FC = () => {
  const { blogs, seoSettings } = useCMS();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Unique categories for blog filters
  const blogCategories = useMemo(() => {
    const categoriesSet = new Set(blogs.map((b) => b.category));
    return ['All', ...Array.from(categoriesSet)];
  }, [blogs]);

  // Filters blogs locally
  const filteredBlogs = useMemo(() => {
    let result = [...blogs];

    if (selectedCategory !== 'All') {
      result = result.filter((b) => b.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return result;
  }, [blogs, selectedCategory, searchQuery]);

  const seo = seoSettings.blog || {
    title: 'FreshCart Blog | Cooking Recipes & Healthy Living Guides',
    description: 'Read articles written by verified nutritionists and chefs. Discover morning smoothie bowl recipes and guide to eating organic.',
    keywords: 'healthy recipes, organic benefit nutrition, cold brew guide'
  };

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
          <h1 className="text-4xl font-extrabold mb-3 text-text-primary">FreshCart Magazine</h1>
          <p className="text-sm text-text-secondary">Organic cooking recipes, nutrition guides, and sustainable farming features from specialists.</p>
        </section>

        {/* Search Input bar */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center w-full max-w-[480px] px-4 py-2.5 bg-background border border-divider rounded-full focus-within:border-primary focus-within:bg-surface transition-all duration-200">
            <input
              type="text"
              placeholder="Search recipes or health articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm bg-transparent border-none outline-none text-text-primary placeholder:text-text-tertiary"
            />
            <button className="text-text-secondary hover:text-primary transition-colors">
              <Search size={16} />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex justify-center flex-wrap gap-2.5 mb-10">
          {blogCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 border border-divider rounded-full text-xs font-semibold bg-surface hover:border-primary transition-all duration-200 ${
                selectedCategory === cat ? 'bg-primary/10 border-primary text-primary' : 'text-text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Article Grid */}
        <section>
          {filteredBlogs.length === 0 ? (
            <div className="bg-surface p-12 rounded-2xl border border-divider text-center shadow-card flex flex-col items-center justify-center text-text-secondary">
              <BookOpen size={36} className="text-text-tertiary mb-3 animate-pulse" />
              <h3 className="font-bold text-text-primary text-lg">No articles found</h3>
              <p className="text-xs text-text-secondary mt-1">Try adjusting your search filters or keyword query.</p>
            </div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <AnimatePresence mode="popLayout">
                {filteredBlogs.map((post) => (
                  <motion.article 
                    layout
                    key={post.id}
                    className="bg-surface rounded-2xl border border-divider shadow-card overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-premium flex flex-col"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Link to={`/blog/${post.id}`}>
                      <img src={post.coverImage} alt={post.title} className="w-full aspect-[16/9] object-cover" loading="lazy" />
                    </Link>

                    <div className="p-5 flex flex-col gap-2 flex-grow">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{post.category}</span>
                      <Link to={`/blog/${post.id}`}>
                        <h3 className="text-base font-extrabold text-text-primary hover:text-primary transition-colors line-clamp-1">{post.title}</h3>
                      </Link>
                      <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">{post.excerpt}</p>
                      
                      <div className="flex justify-between items-center text-[10px] text-text-tertiary font-medium mt-auto pt-2 border-t border-divider">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} />
                          <span>{post.readTime}</span>
                        </div>
                        <span>{post.date}</span>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>
      </div>
    </div>
  );
};
