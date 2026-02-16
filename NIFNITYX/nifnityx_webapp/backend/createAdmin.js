import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import User from "./models/User.js";

dotenv.config({ path: "./backend/.env" });

const createAdmin = async () => {
    try {
        await connectDB();

        const email = "admin@nifnityx.com";
        const password = "123456"; // Default password

        const userExists = await User.findOne({ email });

        if (userExists) {
            userExists.password = password;
            userExists.role = "admin"; // Ensure admin role
            // Ensure settings exist
            if (!userExists.settings) userExists.settings = {};
            userExists.settings.executionMode = "manual";

            await userExists.save();
            console.log(`✅ Admin updated: ${email} | Password: ${password}`);
        } else {
            const user = await User.create({
                email,
                password,
                role: "admin",
                settings: {
                    executionMode: "manual",
                    tradingMode: "paper",
                    theme: "dark"
                }
            });
            console.log(`✅ Admin created: ${email} | Password: ${password}`);
        }

        process.exit();
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
};

createAdmin();
