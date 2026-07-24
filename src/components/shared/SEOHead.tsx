import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getSEOMetadata, SITE_NAME, SITE_URL, DEFAULT_OG_IMAGE } from '../../utils/seoData';

interface SEOHeadProps {
  customTitle?: string;
  customDescription?: string;
  category?: string;
  categoryName?: string;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  customTitle,
  customDescription,
  category,
  categoryName
}) => {
  const location = useLocation();
  const meta = getSEOMetadata(location.pathname);

  const title = customTitle || meta.title;
  const description = customDescription || meta.description;
  const canonicalUrl = meta.canonical || `${SITE_URL}${location.pathname}`;
  const keywordsStr = meta.keywords ? meta.keywords.join(', ') : '';

  useEffect(() => {
    // 1. Update Title
    document.title = title;

    // Helper to set/update meta tag
    const setMetaTag = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
      let element = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Helper to set/update link tag
    const setLinkTag = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    };

    // 2. Set Standard SEO Meta Tags
    setMetaTag('description', description);
    if (keywordsStr) setMetaTag('keywords', keywordsStr);
    setMetaTag('robots', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
    setMetaTag('author', 'Tools Cafe');

    // 3. Set Canonical Link
    setLinkTag('canonical', canonicalUrl);

    // 4. Set Open Graph (Facebook / LinkedIn / Social) Meta Tags
    setMetaTag('og:site_name', SITE_NAME, 'property');
    setMetaTag('og:type', meta.schemaType === 'WebApplication' ? 'website' : 'website', 'property');
    setMetaTag('og:title', title, 'property');
    setMetaTag('og:description', description, 'property');
    setMetaTag('og:url', canonicalUrl, 'property');
    setMetaTag('og:image', DEFAULT_OG_IMAGE, 'property');

    // 5. Set Twitter Card Meta Tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:site', '@toolscafe');
    setMetaTag('twitter:title', title);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', DEFAULT_OG_IMAGE);

    // 6. Manage JSON-LD Structured Data
    const existingScripts = document.querySelectorAll('script[data-seo-jsonld="true"]');
    existingScripts.forEach((script) => script.remove());

    const schemas: object[] = [];

    // WebSite / SearchAction Schema for Homepage
    if (location.pathname === '/') {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        'name': SITE_NAME,
        'url': SITE_URL,
        'description': description,
        'potentialAction': {
          '@type': 'SearchAction',
          'target': `${SITE_URL}/tools?search={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      });
    }

    // SoftwareApplication / WebApplication Schema for Tools
    if (meta.schemaType === 'WebApplication' || location.pathname.startsWith('/tools/')) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        'name': title.split('-')[0].trim(),
        'operatingSystem': 'Any (Web Browser)',
        'applicationCategory': 'UtilitiesApplication',
        'browserRequirements': 'Requires HTML5, WebAssembly',
        'offers': {
          '@type': 'Offer',
          'price': '0.00',
          'priceCurrency': 'USD'
        },
        'aggregateRating': {
          '@type': 'AggregateRating',
          'ratingValue': '4.9',
          'ratingCount': '2480',
          'bestRating': '5',
          'worstRating': '1'
        },
        'description': description,
        'url': canonicalUrl
      });
    }

    // BreadcrumbList Schema for non-home pages
    if (location.pathname !== '/') {
      const breadcrumbItems = [
        {
          '@type': 'ListItem',
          'position': 1,
          'name': 'Home',
          'item': SITE_URL
        }
      ];

      if (location.pathname.startsWith('/tools/')) {
        breadcrumbItems.push({
          '@type': 'ListItem',
          'position': 2,
          'name': 'Tools',
          'item': `${SITE_URL}/tools`
        });

        const activeCat = categoryName || meta.categoryName || 'Tool';
        const activeCatId = category || meta.category || 'all';

        breadcrumbItems.push({
          '@type': 'ListItem',
          'position': 3,
          'name': activeCat,
          'item': `${SITE_URL}/tools?category=${activeCatId}`
        });

        breadcrumbItems.push({
          '@type': 'ListItem',
          'position': 4,
          'name': title.split('-')[0].trim(),
          'item': canonicalUrl
        });
      } else {
        breadcrumbItems.push({
          '@type': 'ListItem',
          'position': 2,
          'name': location.pathname.replace('/', '').toUpperCase(),
          'item': canonicalUrl
        });
      }

      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': breadcrumbItems
      });
    }

    // HowTo Schema if steps are defined
    if (meta.steps && meta.steps.length > 0) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        'name': `How to use ${title.split('-')[0].trim()}`,
        'description': description,
        'step': meta.steps.map((step, idx) => ({
          '@type': 'HowToStep',
          'position': idx + 1,
          'name': step.title,
          'text': step.description
        }))
      });
    }

    // FAQPage Schema if FAQs are defined
    if (meta.faqs && meta.faqs.length > 0) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': meta.faqs.map((faq) => ({
          '@type': 'Question',
          'name': faq.question,
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': faq.answer
          }
        }))
      });
    }

    // Append schemas to head
    schemas.forEach((schema) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-jsonld', 'true');
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    });

  }, [location.pathname, title, description, canonicalUrl, keywordsStr, category, categoryName, meta]);

  return null;
};

export default SEOHead;
