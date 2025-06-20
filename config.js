// Configuração segura para variáveis de ambiente
// Para ambiente browser, as variáveis são definidas aqui
const config = {
    firebase: {
        apiKey: "AIzaSyAnPLwZO5i_Ky0nBfI14gzNsRqvVMIOqdk",
        authDomain: "controle-func.firebaseapp.com",
        projectId: "controle-func",
        storageBucket: "controle-func.firebasestorage.app",
        messagingSenderId: "146164640694",
        appId: "1:146164640694:web:d52beaeaa4b1b38cc76f17",
        databaseURL: "https://controle-func-default-rtdb.firebaseio.com"
    },
    environment: 'production',
    isDevelopment: false
};

// Função para sanitizar strings
function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[<>\"']/g, function(match) {
        const escape = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;'
        };
        return escape[match];
    });
}

// Função para validar email
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Função para logging seguro
function secureLog(message, data = null) {
    if (config.isDevelopment) {
        console.log(`[${new Date().toISOString()}] ${message}`, data);
    }
}

export { config, sanitizeString, validateEmail, secureLog };