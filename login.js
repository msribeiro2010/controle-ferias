firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
        window.location.href = 'controle.html';
    })
    .catch((error) => {
        // ... tratamento de erro existente ...
    }); 