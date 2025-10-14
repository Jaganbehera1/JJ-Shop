# Local Ration Shop - Grocery Delivery Application

A full-featured grocery delivery application with separate interfaces for shop owners and customers. Built with React, TypeScript, Tailwind CSS, and Supabase.

## Features

### Shop Owner Dashboard
- Email/password authentication
- Automatic GPS location capture on first login
- Add, edit, and delete grocery items
- Multiple quantity variants per item (e.g., 500g, 1kg, 2kg)
- Image upload for products
- Real-time order management
- Update order status (Pending → Accepted → Delivered / Cancelled)

### Customer App
- Register/login with email
- Browse all grocery items
- Search and filter by category
- Add items to cart with quantity selection
- GPS-based location verification (5km radius)
- Secure checkout with delivery address
- Real-time order tracking
- Order history with status updates

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Icons**: Lucide React

## Database Schema

- **profiles** - User profiles with roles (owner/customer)
- **shop_location** - Shop GPS coordinates
- **categories** - Product categories
- **items** - Grocery items
- **item_variants** - Product quantities and prices
- **orders** - Customer orders with delivery info
- **order_items** - Order line items

## Setup Instructions

1. The Supabase database is already configured with the connection details in `.env`

2. Create a storage bucket for images:
   - Go to Supabase Dashboard → Storage
   - Create a new bucket named `images`
   - Make it public

3. Install dependencies:
   ```bash
   npm install
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## Usage

### As Shop Owner
1. Select "Shop Owner" on landing page
2. Register or login with email
3. Set shop location (GPS required)
4. Add grocery items with variants and prices
5. Monitor and manage incoming orders

### As Customer
1. Select "Customer" on landing page
2. Register or login with email
3. Browse and add items to cart
4. Enter delivery address and share location
5. Place order (validates 5km radius)
6. Track order status in Order History

## Key Features

- **Location-based Delivery**: Uses Haversine formula to calculate distance and restrict orders beyond 5km
- **Real-time Updates**: Order status changes reflect instantly using Supabase real-time subscriptions
- **Responsive Design**: Mobile-optimized interface for customers
- **Image Management**: Upload and store product images
- **Order Tracking**: Live status updates for pending, accepted, delivered, and cancelled orders

## Security

- Row Level Security (RLS) enabled on all tables
- Owners can only manage their shop data
- Customers can only view their own orders
- Authentication required for all operations
- GPS verification for delivery eligibility

## Build

```bash
npm run build
```

The production build will be in the `dist` directory.
