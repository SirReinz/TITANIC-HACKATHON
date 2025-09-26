"use client";

import { doc, getDoc, updateDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function updateAllLocationUsernames() {
  console.log('Starting to update all location usernames...');
  
  try {
    const locationsSnapshot = await getDocs(collection(db, 'locations'));
    const batch = writeBatch(db);
    let updatedCount = 0;

    for (const locationDoc of locationsSnapshot.docs) {
      const locationData = locationDoc.data();
      const userId = locationDoc.id;

      // Skip if already has a proper username (not an email)
      if (locationData.username && !locationData.username.includes('@')) {
        continue;
      }

      try {
        // Get the user's profile data
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const username = userData.username || 'Anonymous';

          // Update the location document with the proper username
          batch.update(doc(db, 'locations', userId), {
            username: username
          });
          
          updatedCount++;
          console.log(`Updated username for user ${userId}: ${username}`);
        }
      } catch (error) {
        console.error(`Error updating username for user ${userId}:`, error);
      }
    }

    if (updatedCount > 0) {
      await batch.commit();
      console.log(`Successfully updated ${updatedCount} location records with proper usernames`);
    } else {
      console.log('No location records needed username updates');
    }

    return { success: true, updatedCount };
  } catch (error) {
    console.error('Error updating location usernames:', error);
    return { success: false, error };
  }
}

export async function updateSingleLocationUsername(userId: string) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const username = userData.username || 'Anonymous';

      await updateDoc(doc(db, 'locations', userId), {
        username: username
      });

      console.log(`Updated username for user ${userId}: ${username}`);
      return { success: true, username };
    }
    return { success: false, error: 'User not found' };
  } catch (error) {
    console.error(`Error updating username for user ${userId}:`, error);
    return { success: false, error };
  }
}