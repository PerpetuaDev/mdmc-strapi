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

export interface CareersOffer extends Struct.ComponentSchema {
  collectionName: 'components_careers_offers';
  info: {
    displayName: 'Offer';
    icon: 'heart';
  };
  attributes: {
    body: Schema.Attribute.Text;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ProjectGallerySlot extends Struct.ComponentSchema {
  collectionName: 'components_project_gallery_slots';
  info: {
    description: 'One gallery image with its layout slot and caption';
    displayName: 'Gallery slot';
  };
  attributes: {
    caption: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    kind: Schema.Attribute.Enumeration<
      ['hero', 'two_up', 'square', 'full_bleed']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'two_up'>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'about.kv-item': AboutKvItem;
      'careers.offer': CareersOffer;
      'project.gallery-slot': ProjectGallerySlot;
    }
  }
}
