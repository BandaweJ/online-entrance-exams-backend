import { AppDataSource } from "../config/data-source";

async function runMigrations() {
  try {
    console.log("Initializing database connection...");
    await AppDataSource.initialize();
    
    console.log("Running database migrations...");
    await AppDataSource.runMigrations();
    
    console.log("Database migrations completed successfully");
    
    await AppDataSource.destroy();
    console.log("Database connection closed");
  } catch (error) {
    console.error("Error running migrations:", error);
    process.exit(1);
  }
}

runMigrations();
