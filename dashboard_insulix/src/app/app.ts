import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBjn6Y_ueb4QVSFEpFDmQedOBJ3YTQ62WE",
  authDomain: "insulix-4c63c.firebaseapp.com",
  projectId: "insulix-4c63c",
  storageBucket: "insulix-4c63c.firebasestorage.app",
  messagingSenderId: "333667857568",
  appId: "1:333667857568:web:87a7f19c7c3135a46105c5",
  measurementId: "G-JZTWRDB3K4"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('panel-admin');
}
