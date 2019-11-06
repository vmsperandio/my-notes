import { TimeStamp, IFindOptions, IUser, IPost } from "@my-notes/db";
import { fetchJSON } from '@/global';

class Collection<T extends {_id: string, tag?: string[]}> {
  constructor(public name: string) {}

  async find(q: string, options: Partial<IFindOptions> = {}): Promise<{
    data: TimeStamp<T>[];
    count: number;
  }> {
    return await fetchJSON(`/api/${this.name}/`, {q, options});
  }

  async get(id: string): Promise<TimeStamp<T> | null> {
    return await fetchJSON(`/api/${this.name}/${id}`);
  }

  async create(entry: T): Promise<{id: string}> {
    return await fetchJSON(`/api/${this.name}/`, entry, "PUT");
  }

  async getSafeId(title?: string) {
    return await fetchJSON(`/api/${this.name}/safeId`, {title}, "GET");
  }

  async update(id: string, update: Partial<T>) {
    return await fetchJSON(`/api/${this.name}/${id}`, update, "PUT");
  }

  async delete(id: string) {
    return await fetchJSON(`/api/${this.name}/${id}`, null, "DELETE");
  }

  async addTag(id: string, tag: string[]) {
    return await fetchJSON(`/api/${this.name}/${id}/tag`, {tag}, "PUT");
  }

  async removeTag(id: string, tag: string[]) {
    return await fetchJSON(`/api/${this.name}/${id}/tag`, {tag}, "PUT");
  }
}

class Database {
  cols: {
    user: Collection<IUser>;
    post: Collection<IPost>;
  }

  constructor() {
    this.cols = {
      user: new Collection("user"),
      post: new Collection("post")
    }
  }
}

const db = new Database();

export default db;
