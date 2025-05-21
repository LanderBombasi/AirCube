import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyBxUcmdxqy_zupA-8vZIzdogp7_0JkZr5M",
    authDomain: "aircube-8eba0.firebaseapp.com",
    databaseURL: "https://aircube-8eba0-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "aircube-8eba0",
    storageBucket: "aircube-8eba0.firebasestorage.app",
    messagingSenderId: "208758273252",
    appId: "1:208758273252:web:888273cd8b0707d95268f1"
  };

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };
