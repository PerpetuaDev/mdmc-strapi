import type { Schema, Struct } from '@strapi/strapi';

export interface AboutKvItem extends Struct.ComponentSchema {
  collectionName: 'components_about_kv_items';
  info: {
    displayName: 'KV Item';
    icon: 'align-left';
  };
  attributes: {
    body: Schema.Attribute.Text;
    image: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'about.kv-item': AboutKvItem;
    }
  }
}
