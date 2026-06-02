// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDQIs8Xo7exgaOXgmPNon1Etk9G47DcwtU",
    authDomain: "dibostore.firebaseapp.com",
    databaseURL: "[dibostore-default-rtdb.firebaseio.com](https://dibostore-default-rtdb.firebaseio.com)",
    projectId: "dibostore",
    storageBucket: "dibostore.firebasestorage.app",
    messagingSenderId: "130108385787",
    appId: "1:130108385787:web:32b742834caecf2cb5435e",
    measurementId: "G-5KEEFH60TJ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Database and Storage references
const db = firebase.database();
const storage = firebase.storage();

console.log('Firebase initialized successfully');
