// Định nghĩa các màu chỉ thêu phổ biến
export const THREAD_COLORS = [
  { id: '001', name: 'Trắng', hex: '#FFFFFF' },
  { id: '002', name: 'Đen', hex: '#000000' },
  { id: '003', name: 'Đỏ', hex: '#FF0000' },
  { id: '004', name: 'Xanh dương', hex: '#0000FF' },
  { id: '005', name: 'Vàng', hex: '#FFFF00' },
  { id: '006', name: 'Xanh lá', hex: '#00FF00' },
  { id: '007', name: 'Cam', hex: '#FFA500' },
  { id: '008', name: 'Tím', hex: '#800080' },
  { id: '009', name: 'Hồng', hex: '#FFC0CB' },
  { id: '010', name: 'Nâu', hex: '#A52A2A' },
  // ... thêm 90 màu khác tương tự
];

export const MACHINE_STATUSES = [
  { value: 'idle', label: 'Đang rảnh', color: 'yellow' },
  { value: 'working', label: 'Đang hoạt động', color: 'green' },
  { value: 'maintenance', label: 'Đang bảo trì', color: 'red' }
];

export const PRODUCT_PRIORITIES = [
  { value: 1, label: 'Thấp' },
  { value: 2, label: 'Trung bình' },
  { value: 3, label: 'Cao' },
  { value: 4, label: 'Khẩn cấp' }
];
