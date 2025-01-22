// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAnPLwZO5i_Ky0nBfI14gzNsRqvVMIOqdk",
  authDomain: "controle-func.firebaseapp.com",
  databaseURL: "https://controle-func-default-rtdb.firebaseio.com",
  projectId: "controle-func",
  storageBucket: "controle-func.firebasestorage.app",
  messagingSenderId: "146164640694",
  appId: "1:146164640694:web:d52beaeaa4b1b38cc76f17",
  measurementId: "G-2LQHMZS6XH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);