/**
 * Database connection stub
 * This is a placeholder to prevent import errors
 * In production, this would connect to your actual database
 */

export const db = {
  // Placeholder methods to prevent errors
  collection: () => ({
    findOne: () => Promise.resolve(null),
    find: () => Promise.resolve([]),
    insertOne: () => Promise.resolve({ insertedId: null }),
    updateOne: () => Promise.resolve({ modifiedCount: 0 }),
    deleteOne: () => Promise.resolve({ deletedCount: 0 })
  })
};

// Export getDb function that returns the db instance
export const getDb = () => db;

export default db; 