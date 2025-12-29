🎒 Campus Lost & Found Web Application

A full-stack web application designed to help students efficiently report, search, and claim lost or found items within a college campus. The platform includes authentication, admin workflows, image uploads, smart matching, and real-time push notifications.

🚀 Features

👤 Student Features
      Student registration and login
      Report lost and found items with image uploads
      Browse all reported items with filters and search
      Claim lost or found items
      View personal claim history
      Receive real-time push notifications for:
      Claim approval or rejection
      New lost or found item reports
      Possible matches for previously reported lost items

🛠️ Admin Features
     Secure admin login
     View all claims submitted by students
     Approve or reject claims
     Automatically mark items as resolved upon claim approval

🔔 Notification System
     Web Push Notifications using Service Workers
     Broadcast notifications for new lost/found items
     Personalized notifications for:
     Claim status updates

Matching found items based on category and location

🧰 Tech Stack

Frontend
  EJS (Embedded JavaScript Templates)
  HTML5, CSS3
  Responsive UI design

Backend
  Node.js
  Express.js
  RESTful APIs
  Database & Storage
  MongoDB Atlas (cloud database)
  Cloudinary (image storage and optimization)

Authentication & Security
  Express Session
  bcrypt for password hashing
  Role-based access (Student / Admin)

Notifications
   Web Push API
   Service Workers
   VAPID keys

📂 Project Structure

campus-lost-and-found/
│
├── models/          # Mongoose schemas (User, Item, Claim, Subscription)
├── views/           # EJS templates
├── public/          # CSS, JS, images
├── app.js           # Main server file
├── package.json     # Dependencies
├── .gitignore       # Ignored files
└── README.md        # Project documentation

⚙️ How to Run Locally

  1️⃣ Clone the repository
      git clone https://github.com/<your-username>/lost_and_found.git
      cd lost_and_found

  2️⃣ Install dependencies
    npm install

  3️⃣ Create .env file
    Create a .env file in the root directory and add:

PORT=4444
MONGO_URI=your_mongodb_atlas_url
SESSION_SECRET=your_secret_key

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=mailto:youremail@example.com

ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

4️⃣ Run the application
    node app.js


Open browser and visit:
http://localhost:4444

🧪 Demo Accounts
   Admin
   Username: admin
  Password: admin123

🔮 Future Enhancements
    Email notifications for claims and reports
    Mobile application integration
    AI-based image matching for lost & found items
    Campus QR codes for quick item reporting
    Analytics dashboard for admins
