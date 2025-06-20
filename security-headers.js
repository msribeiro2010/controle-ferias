// Content Security Policy e Headers de Segurança
const securityHeaders = {
    'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://www.gstatic.com https://apis.google.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https://controle-func-default-rtdb.firebaseio.com https://identitytoolkit.googleapis.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
    ].join('; '),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};

// Função para aplicar headers de segurança
function applySecurityHeaders() {
    const metaElements = [];
    
    // CSP via meta tag
    const cspMeta = document.createElement('meta');
    cspMeta.httpEquiv = 'Content-Security-Policy';
    cspMeta.content = securityHeaders['Content-Security-Policy'];
    metaElements.push(cspMeta);
    
    // X-Frame-Options via meta tag
    const frameMeta = document.createElement('meta');
    frameMeta.httpEquiv = 'X-Frame-Options';
    frameMeta.content = securityHeaders['X-Frame-Options'];
    metaElements.push(frameMeta);
    
    // Aplicar ao head
    metaElements.forEach(meta => {
        document.head.appendChild(meta);
    });
}

// Aplicar na inicialização
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySecurityHeaders);
} else {
    applySecurityHeaders();
}

export { securityHeaders, applySecurityHeaders };