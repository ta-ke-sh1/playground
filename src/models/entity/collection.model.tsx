export interface CollectionItemEntity {
  id: number;
  name: string;
  tags: string[];
  url: string;
  author: string;
  collection_id: number;
  category_id: number;
  year: string;
  created_at: string;
}

export interface CollectionEntity {
  id: number;
  date: string;
  name: string;
  created_at: string;
  collection_items: CollectionItemEntity[];
}
