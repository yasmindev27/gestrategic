import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  canonical?: string;
  noIndex?: boolean;
}

export function SEOHead({
  title = 'Gestrategic - Gestão Hospitalar Inteligente',
  description = 'Sistema completo de gestão hospitalar com segurança, monitoramento 24/7, conformidade LGPD e integração total.',
  keywords = 'gestão hospitalar, sistema de saúde, LGPD, hospital, clínica, monitoramento, TI hospitalar',
  ogImage,
  ogType = 'website',
  canonical,
  noIndex = false,
}: SEOHeadProps) {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Update or create meta tags
    const updateMeta = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    updateMeta('description', description);
    updateMeta('keywords', keywords);
    updateMeta('og:title', title, true);
    updateMeta('og:description', description, true);
    updateMeta('og:type', ogType, true);
    
    if (ogImage) {
      updateMeta('og:image', ogImage, true);
    }

    if (noIndex) {
      updateMeta('robots', 'noindex, nofollow');
    }

    // Handle canonical URL
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = canonical;
    }

    // Cleanup
    return () => {
      // Reset to defaults on unmount if needed
    };
  }, [title, description, keywords, ogImage, ogType, canonical, noIndex]);

  return null;
}

// JSON-LD Structured Data Component
interface OrganizationSchemaProps {
  name?: string;
  description?: string;
  url?: string;
  logo?: string;
}

export function OrganizationSchema({
  name = 'Gestrategic',
  description = 'Tecnologia em Saúde - Gestão Hospitalar Inteligente',
  url = 'https://gestrategic.lovable.app',
  logo,
}: OrganizationSchemaProps) {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'organization-schema';
    
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name,
      description,
      url,
      ...(logo && { logo }),
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        availableLanguage: 'Portuguese',
      },
      sameAs: [],
    };

    script.textContent = JSON.stringify(schema);
    
    // Remove existing script if present
    const existing = document.getElementById('organization-schema');
    if (existing) {
      existing.remove();
    }
    
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById('organization-schema');
      if (el) el.remove();
    };
  }, [name, description, url, logo]);

  return null;
}

// Service Schema for Healthcare Services
export function HealthcareServiceSchema() {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'service-schema';
    
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      serviceType: 'Healthcare IT Management',
      provider: {
        '@type': 'Organization',
        name: 'Gestrategic',
      },
      description: 'Automação inteligente e infraestrutura de TI de alta performance para hospitais, clínicas e centros diagnóstico.',
      areaServed: {
        '@type': 'Country',
        name: 'Brasil',
      },
    };

    script.textContent = JSON.stringify(schema);
    
    const existing = document.getElementById('service-schema');
    if (existing) existing.remove();
    
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById('service-schema');
      if (el) el.remove();
    };
  }, []);

  return null;
}
