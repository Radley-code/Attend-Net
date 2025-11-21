const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// Connect to MongoDB
const uri = "mongodb+srv://radleyacha00_db_user:bw9vy6xUG3iSBbKb@attendnet-cluster.xxrf6qc.mongodb.net/?appName=attendnet-cluster";

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error("Connection error:", err));

    //Simple test route
app.get('/', (req, res) => {
    res.send('AttendNet Server is running');
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});