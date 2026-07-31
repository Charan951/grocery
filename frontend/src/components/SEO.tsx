import React, { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogType?: string;
  ogImage?: string;
  schema?: Record<string, any>;
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  canonical,
  ogType = 'website',
  ogImage = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop', // default fresh cart cover
  schema,
}) => {
  useEffect(() => {
    // 1. Update Title
    document.title = title;

    // 2. Update Meta Description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    // 3. Update Meta Keywords
    if (keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.setAttribute('name', 'keywords');
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.setAttribute('content', keywords);
    }

    // 4. Update OpenGraph Tags
    const ogTags = {
      'og:title': title,
      'og:description': description,
      'og:image': ogImage,
      'og:type': ogType,
      'og:url': window.location.href,
      'og:site_name': 'FreshCart',
    };

    Object.entries(ogTags).forEach(([property, value]) => {
      let element = document.querySelector(`meta[property="${property}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('property', property);
        document.head.appendChild(element);
      }
      element.setAttribute('content', value);
    });

    // 5. Update Twitter Card Tags
    const twitterTags = {
      'twitter:card': 'summary_large_image',
      'twitter:title': title,
      'twitter:description': description,
      'twitter:image': ogImage,
    };

    Object.entries(twitterTags).forEach(([name, value]) => {
      let element = document.querySelector(`meta[name="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('name', name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', value);
    });

    // 6. Update Canonical Link
    const canonicalUrl = canonical || window.location.href;
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', canonicalUrl);

    // 7. Inject JSON-LD Schema
    let scriptSchema = document.getElementById('seo-jsonld-schema') as HTMLScriptElement;
    if (scriptSchema) {
      scriptSchema.remove();
    }

    if (schema) {
      scriptSchema = document.createElement('script');
      scriptSchema.id = 'seo-jsonld-schema';
      scriptSchema.type = 'application/ld+json';
      scriptSchema.innerHTML = JSON.stringify({
        '@context': 'https://schema.org',
        ...schema,
      });
      document.head.appendChild(scriptSchema);
    }

    return () => {
      // Clean up injected schema on unmount
      const script = document.getElementById('seo-jsonld-schema');
      if (script) {
        script.remove();
      }
    };
  }, [title, description, keywords, canonical, ogType, ogImage, schema]);

  return null;
};
