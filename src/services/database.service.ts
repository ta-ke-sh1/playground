import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../database/database.connection";

export default class DatabaseService {
    private static instance: DatabaseService;

    private readonly database: SupabaseClient;

    private constructor() {
        this.database = supabase;
    }

    public static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }

        return DatabaseService.instance;
    }

    public getDatabase() {
        return this.database;
    }

    public async getAll(table: string) {
        if(!table) {
            throw `No table "${table}" found.`;
        }

        return this.database.from(table).select();
    }

    public async getById(table: string, id: string) {
        return this.database.from(table).select().eq('id', id)
    }

    public async create(table: string, data: any) {
        return this.database.from(table).insert(data);
    }

    public async updateById(table: string, id: number, data: any) {
        return this.database.from(table).update(data).eq('id', id);
    }

    public async deleteById(table: string, id: number) {
        return this.database.from(table).delete().eq('id', id);
    }
}
