-- Add RETIRED to OrderStatus enum
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'RETIRED';
