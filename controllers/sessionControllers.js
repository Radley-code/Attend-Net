const Session = require("../models/Session");

const createSession = async (req, res) => {
    try {
        const { course, date, startTime, endTime, departments } = req.body;
        console.log(departments);
        const newSession = new Session({
            course,
            date,
            startTime,
            endTime,
            departments
        });
        await newSession.save();
        res.status(201).json({ message: "Session created successfully", session: newSession });
    } catch (error) {
        console.error("Error creating session:", error);
        res.status(500).json({ message: "Server error during session creation" });
    }
};

module.exports = {
    createSession
};