import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "fake-db-12345");

async function testConnection() {
  try {
    console.log("Testing connection...");
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Connection successful!");
  } catch (error) {
    console.error("Connection failed:", error);
  }
}

testConnection();
