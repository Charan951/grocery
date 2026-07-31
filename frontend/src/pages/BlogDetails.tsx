import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCMS } from '../context/CMSContext';
import { SEO } from '../components/SEO';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Calendar } from 'lucide-react';

export const BlogDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { blogs, addBlogComment } = useCMS();

  // Find target blog
  const blog = useMemo(() => blogs.find((b) => b.id === id), [blogs, id]);

  // Comment Form States
  const [authorName, setAuthorName] = useState('');
  const [commentContent, setCommentContent] = useState('');

  // Find related articles (same category, excluding current)
  const relatedBlogs = useMemo(() => {
    if (!blog) return [];
    return blogs.filter((b) => b.category === blog.category && b.id !== blog.id).slice(0, 2);
  }, [blogs, blog]);

  if (!blog) {
    return (
      <div className="page-wrapper py-20 text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-4">Article Not Found</h2>
          <p className="text-text-secondary mb-6">The blog post you are looking for has been removed or does not exist.</p>
          <Link to="/blog" className="bg-primary text-white py-3 px-6 rounded-full font-bold">Back to Magazine</Link>
        </div>
      </div>
    );
  }

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !commentContent.trim()) {
      alert('Please fill out all commenting fields.');
      return;
    }

    addBlogComment(blog.id, {
      authorName: authorName.trim(),
      content: commentContent.trim()
    });

    setAuthorName('');
    setCommentContent('');
    alert('Your comment has been posted successfully!');
  };

  return (
    <div className="page-wrapper">
      <SEO 
        title={`${blog.title} | FreshCart Health Magazine`}
        description={blog.excerpt}
        ogImage={blog.coverImage}
        ogType="article"
      />

      <div className="container mx-auto px-4 md:px-6 max-w-[800px] py-8 pb-16">
        {/* Back Link */}
        <Link to="/blog" className="flex items-center gap-1.5 text-sm font-bold text-primary mb-6 hover:underline">
          <ArrowLeft size={16} />
          <span>Back to Magazine</span>
        </Link>

        {/* Article Header */}
        <header className="mb-8 text-center md:text-left">
          <span className="text-xs font-bold text-primary uppercase tracking-wider mb-2 block">{blog.category}</span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary mb-4 font-display leading-tight">{blog.title}</h1>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 text-xs text-text-secondary border-y border-divider py-4">
            {/* Author details */}
            <div className="flex items-center gap-3">
              <img src={blog.author.avatar} alt={blog.author.name} className="w-9 h-9 rounded-full object-cover" />
              <div>
                <span className="font-bold text-text-primary block">{blog.author.name}</span>
                <span className="text-[10px] text-text-secondary block">{blog.author.role}</span>
              </div>
            </div>

            <div className="flex gap-4 sm:border-l sm:border-divider sm:pl-4">
              <span className="flex items-center gap-1"><Calendar size={14} /> {blog.date}</span>
              <span className="flex items-center gap-1"><Clock size={14} /> {blog.readTime}</span>
            </div>
          </div>
        </header>

        {/* Cover Image */}
        <div className="rounded-2xl overflow-hidden shadow-premium mb-8 aspect-[16/9]">
          <img src={blog.coverImage} alt={blog.title} className="w-full h-full object-cover" />
        </div>

        {/* Main Content Body */}
        <article className="prose prose-stone max-w-none text-sm md:text-base text-text-primary leading-relaxed flex flex-col gap-4 mb-12">
          <p>{blog.content}</p>
          <p>
            When shopping on FreshCart, you can trust that every item on our shelves matches premium agronomy guidelines. Sourced from Nilgiri beehives and Malur agriculture cooperatives, our vegetables reach our dark stores in under 3 hours from picking. Try blending these tips into your morning schedules and note the digestive changes!
          </p>
        </article>

        {/* Comments Section */}
        <section className="border-t border-divider pt-8 mb-12">
          <h3 className="text-lg font-bold text-text-primary mb-6">Comments ({blog.comments.length})</h3>
          
          <div className="flex flex-col gap-4 mb-8">
            {blog.comments.length === 0 ? (
              <p className="text-text-secondary text-sm italic">No comments posted yet. Be the first to share your thoughts!</p>
            ) : (
              blog.comments.map((comment) => (
                <div key={comment.id} className="bg-background p-4 rounded-xl border border-divider flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-text-primary">{comment.authorName}</span>
                    <span className="text-text-tertiary">{comment.date}</span>
                  </div>
                  <p className="text-xs md:text-sm text-text-secondary leading-relaxed">{comment.content}</p>
                </div>
              ))
            )}
          </div>

          {/* Comment Write Form */}
          <form onSubmit={handleCommentSubmit} className="bg-background p-6 rounded-xl border border-divider flex flex-col gap-4">
            <h4 className="text-sm font-bold text-text-primary">Leave a Comment</h4>
            
            <input
              type="text"
              placeholder="Your Name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary"
              required
            />
            
            <textarea
              placeholder="Share your thoughts about this article or recipe..."
              rows={4}
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary"
              required
            />

            <button type="submit" className="bg-primary text-white font-bold py-2.5 px-6 rounded-full text-xs hover:bg-secondary transition-colors self-start">
              Post Comment
            </button>
          </form>
        </section>

        {/* Related Articles */}
        {relatedBlogs.length > 0 && (
          <section className="border-t border-divider pt-8">
            <h3 className="text-lg font-bold text-text-primary mb-6">Related Health Guides</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {relatedBlogs.map((post) => (
                <Link to={`/blog/${post.id}`} key={post.id} className="bg-surface rounded-xl border border-divider shadow-card overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-premium flex flex-col">
                  <img src={post.coverImage} alt={post.title} className="w-full aspect-[16/9] object-cover" />
                  <div className="p-4 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{post.category}</span>
                    <h4 className="text-sm font-bold text-text-primary line-clamp-1">{post.title}</h4>
                    <span className="text-[10px] text-text-secondary">{post.date}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
};
