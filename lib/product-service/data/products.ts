export type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  count: number;
  imageUrl: string;
};

export const products: Product[] = [
  {
    id: "prod-001",
    title: "Wireless Keyboard",
    description:
      "Compact mechanical keyboard with backlight and USB-C charging.",
    price: 79,
    count: 14,
    imageUrl: "https://example.com/images/wireless-keyboard.jpg",
  },
  {
    id: "prod-002",
    title: "Noise-Canceling Headphones",
    description:
      "Over-ear headphones with active noise cancellation and 30h battery.",
    price: 159,
    count: 8,
    imageUrl: "https://example.com/images/noise-canceling-headphones.jpg",
  },
  {
    id: "prod-003",
    title: '4K Monitor 27"',
    description: "27-inch UHD display with HDR support and adjustable stand.",
    price: 329,
    count: 5,
    imageUrl: "https://example.com/images/4k-monitor-27.jpg",
  },
  {
    id: "prod-004",
    title: "USB-C Docking Station",
    description:
      "Multiport docking station with HDMI, Ethernet, and SD card slots.",
    price: 109,
    count: 20,
    imageUrl: "https://example.com/images/usb-c-docking-station.jpg",
  },
  {
    id: "prod-005",
    title: "Ergonomic Office Chair",
    description:
      "Mesh office chair with lumbar support and adjustable armrests.",
    price: 249,
    count: 6,
    imageUrl: "https://example.com/images/ergonomic-office-chair.jpg",
  },
];
