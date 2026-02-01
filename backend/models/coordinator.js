const { default: mongoose } = require("mongoose");

const cordinatorSchema = new mongoose.Schema({
    name: String,
    email: {type: String, unique: true},
    password: String, //hashed
    role: { type: String, default: "coordinator" },
    department: String,
});
module.exports = mongoose.model("Coordinator", cordinatorSchema);