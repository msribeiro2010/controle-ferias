import { 
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateEmail,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

const DOMINIO_CORPORATIVO = 'trt15.jus.br'; // Ajuste aqui

// Função para registrar novo usuário de e-mail corporativo
export async function registrarUsuarioCorporativo(email, senha) {
  if (!email || !senha) {
    throw new Error('E-mail e senha são obrigatórios.');
  }

  // Validar formato do e-mail
  if (!email.includes('@')) {
    throw new Error('Digite um e-mail válido.');
  }

  // Verifica se o e-mail é do domínio exigido
  const dominio = email.split('@')[1];
  if (dominio !== DOMINIO_CORPORATIVO) {
    throw new Error(`Apenas e-mails @${DOMINIO_CORPORATIVO} são permitidos.`);
  }

  // Validar tamanho mínimo da senha
  if (senha.length < 6) {
    throw new Error('A senha deve ter pelo menos 6 caracteres.');
  }

  const auth = getAuth();
  try {
    // Cria a conta e dispara e-mail de verificação
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;
    
    await sendEmailVerification(user);
    console.log('Conta criada e e-mail de verificação enviado para:', email);
    return user;
  } catch (error) {
    console.error('Erro Firebase ao registrar:', error.code); // Debug
    
    switch(error.code) {
      case 'auth/email-already-in-use':
        throw new Error('Este e-mail já está cadastrado. Use "Esqueci minha senha" se necessário.');
      case 'auth/invalid-email':
        throw new Error('Formato de e-mail inválido.');
      case 'auth/operation-not-allowed':
        throw new Error('Cadastro temporariamente indisponível. Contate o suporte.');
      case 'auth/weak-password':
        throw new Error('Senha muito fraca. Use pelo menos 6 caracteres.');
      default:
        throw new Error('Erro ao criar conta. Tente novamente mais tarde.');
    }
  }
}

// Função para login, checando se o e-mail está verificado
export async function loginUsuarioCorporativo(email, senha) {
  if (!email || !senha) {
    throw new Error('Digite seu e-mail e senha.');
  }

  // Validar formato do e-mail
  if (!email.includes('@')) {
    throw new Error('Digite um e-mail válido.');
  }

  // Verificar se é um e-mail do domínio correto
  const dominio = email.split('@')[1];
  if (dominio !== DOMINIO_CORPORATIVO) {
    throw new Error(`Apenas e-mails @${DOMINIO_CORPORATIVO} são permitidos.`);
  }

  const auth = getAuth();
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    if (!user.emailVerified) {
      throw new Error('E-mail não verificado. Verifique sua caixa de entrada e confirme seu e-mail antes de continuar.');
    }
    
    console.log(`Usuário logado e verificado: ${user.email}`);
    return user;
  } catch (error) {
    console.error('Erro Firebase:', error.code); // Debug
    
    switch(error.code) {
      case 'auth/user-not-found':
        throw new Error('E-mail não cadastrado. Use seu e-mail institucional para se registrar.');
      case 'auth/invalid-email':
        throw new Error('E-mail inválido.');
      case 'auth/wrong-password':
        throw new Error('Senha incorreta.');
      case 'auth/too-many-requests':
        throw new Error('Muitas tentativas. Aguarde alguns minutos ou use "Esqueci minha senha".');
      case 'auth/network-request-failed':
        throw new Error('Erro de conexão. Verifique sua internet.');
      default:
        throw new Error('Erro ao fazer login. Tente novamente mais tarde.');
    }
  }
}

// Monitora mudanças de estado de login (útil para tomar
// decisões ou redirecionar se o e-mail não estiver verificado)
export function monitorarEstadoDeLogin() {
  const auth = getAuth();
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('Usuário logado:', user.email, 'Verificado?', user.emailVerified);
      if (!user.emailVerified) {
        console.warn('Email não verificado. Bloqueando algumas funcionalidades...');
        // Ex.: redirecionar ou mostrar um aviso, se quiser
      }
    } else {
      console.log('Nenhum usuário logado.');
    }
  });
}

// Função para enviar e-mail de reset de senha
export async function enviarResetDeSenha(email) {
  if (!email) {
    throw new Error('Digite seu e-mail para receber o link de recuperação.');
  }

  // Verificar se é um e-mail do domínio correto
  const dominio = email.split('@')[1];
  if (dominio !== DOMINIO_CORPORATIVO) {
    throw new Error(`Use seu e-mail institucional (@${DOMINIO_CORPORATIVO}).`);
  }

  const auth = getAuth();
  try {
    await sendPasswordResetEmail(auth, email);
    console.log('E-mail de recuperação enviado para:', email);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      throw new Error('E-mail não cadastrado.');
    }
    throw error;
  }
}

// Função para migrar usuário existente para e-mail
export async function migrarParaEmail(emailInstitucional) {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('Usuário não está logado.');
  }

  try {
    // Atualiza o e-mail
    await updateEmail(user, emailInstitucional);
    
    // Envia e-mail de verificação
    await sendEmailVerification(user);
    
    return user;
  } catch (error) {
    if (error.code === 'auth/requires-recent-login') {
      throw new Error('Por segurança, faça login novamente antes de atualizar seu e-mail.');
    }
    throw error;
  }
} 