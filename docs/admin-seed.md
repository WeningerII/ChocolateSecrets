## First-time admin seed

After first login, manually create a user document in Firestore:
  Collection: users
  Document ID: <your firebase auth uid>
  Fields:
    role: 'admin'
    email: <your email>
    createdAt: <timestamp>

Subsequent users default to 'staff'. An admin can promote them via the 
admin UI (not built yet — manual Firestore update for now).
