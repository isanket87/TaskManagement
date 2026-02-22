/**
 * Singleton Prisma Client
 *
 * All modules must import prisma from this file — never call `new PrismaClient()`
 * directly. Creating multiple PrismaClient instances exhausts the DB connection
 * pool (Supabase/Prisma default is 5 connections per instance).
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

module.exports = prisma;
