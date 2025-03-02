const fs = require('fs');
const path = require('path');

// Lista de arquivos a serem ignorados
const ignoreFiles = [
    'atividades_corrected.html',
    'atividades_fixed.html',
    'atividades_new.html',
    'teste-firebase.html'
];

// Função para adicionar os links de tema no head
function addThemeLinks(content) {
    const themeLinks = `
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <link rel="stylesheet" href="css/theme.css">`;
    
    return content.replace('</head>', `${themeLinks}\n</head>`);
}

// Função para adicionar o script de tema antes do </body>
function addThemeScript(content) {
    return content.replace('</body>', `    <script src="js/theme.js"></script>\n</body>`);
}

// Função para adicionar o botão de tema na navbar
function addThemeButton(content) {
    // Verifica se já existe um botão de tema
    if (content.includes('theme-toggle')) {
        return content;
    }

    // Procura pela div navbar-right
    const navbarRightMatch = content.match(/<div class="navbar-right"[^>]*>([\s\S]*?)<\/div>/);
    if (navbarRightMatch) {
        const themeButton = `
                <button class="theme-toggle" onclick="toggleTheme()">
                    <i class="fas fa-moon"></i>
                    <i class="fas fa-sun"></i>
                    <span>Tema</span>
                </button>`;
        
        const newNavbarRight = navbarRightMatch[0].replace('</div>', `${themeButton}\n            </div>`);
        return content.replace(navbarRightMatch[0], newNavbarRight);
    }

    return content;
}

// Função principal para processar um arquivo
function processFile(filePath) {
    const fileName = path.basename(filePath);
    
    // Ignora arquivos da lista
    if (ignoreFiles.includes(fileName)) {
        console.log(`Ignorando arquivo: ${fileName}`);
        return;
    }

    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Adiciona os links de tema se não existirem
        if (!content.includes('theme.css')) {
            content = addThemeLinks(content);
        }
        
        // Adiciona o script de tema se não existir
        if (!content.includes('theme.js')) {
            content = addThemeScript(content);
        }
        
        // Adiciona o botão de tema se existir uma navbar
        if (content.includes('navbar-right')) {
            content = addThemeButton(content);
        }
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Arquivo processado: ${fileName}`);
    } catch (error) {
        console.error(`Erro ao processar ${fileName}:`, error);
    }
}

// Processa todos os arquivos HTML no diretório
const baseDir = path.resolve(__dirname, '..');
const files = fs.readdirSync(baseDir)
    .filter(file => file.endsWith('.html'))
    .map(file => path.join(baseDir, file));

files.forEach(processFile);
console.log('Processamento concluído!');
