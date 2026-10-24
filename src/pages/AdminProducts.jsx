import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiAlertTriangle,
  FiCheck,
  FiX,
  FiFilter,
  FiRefreshCw,
  FiLayers,
  FiUploadCloud,
  FiImage,
  FiStar,
  FiTag,
  FiPercent,
  FiShield,
  FiCheckCircle,
  FiEye,
  FiVideo,
  FiKey,
} from 'react-icons/fi';
import {
  fetchAdminProductsAPI,
  createAdminProductAPI,
  updateAdminProductAPI,
  updateAdminProductStockAPI,
  deleteAdminProductAPI,
  fetchCategoriesAPI,
  createCategoryAPI,
  deleteCategoryAPI,
} from '../services/api';
import {
  uploadImageToImgBB,
  getImgBBApiKey,
  setImgBBApiKey,
} from '../services/imgbbService';

const DEFAULT_CATEGORIES = [
  { id: 'kitchen', name: 'Kitchen & Dining (রান্নাঘর ও ডাইনিং)', label: 'Kitchen & Dining (রান্নাঘর ও ডাইনিং)' },
  { id: 'cleaning', name: 'Cleaning & Hygiene (পরিষ্কার-পরিচ্ছন্নতা)', label: 'Cleaning & Hygiene (পরিষ্কার-পরিচ্ছন্নতা)' },
  { id: 'baby-kids', name: 'Baby & Kids (বাচ্চাদের যত্ন ও খেলনা)', label: 'Baby & Kids (বাচ্চাদের যত্ন ও খেলনা)' },
  { id: 'beauty', name: 'Beauty & Personal Care (সৌন্দর্য ও প্রসাধন)', label: 'Beauty & Personal Care (সৌন্দর্য ও প্রসাধন)' },
  { id: 'melamine-crockery', name: 'Melamine & Crockery (মেলামাইন ও ক্রোকারিজ)', label: 'Melamine & Crockery (মেলামাইন ও ক্রোকারিজ)' },
  { id: 'toys', name: 'Toys & Games (খেলনা ও গেমস)', label: 'Toys & Games (খেলনা ও গেমস)' },
  { id: 'home-household', name: 'Home & Household (গৃহস্থালি সামগ্রী)', label: 'Home & Household (গৃহস্থালি সামগ্রী)' },
  { id: 'womens-fashion', name: "Women's Fashion (মহিলাদের ফ্যাশন ও গহনা)", label: "Women's Fashion (মহিলাদের ফ্যাশন ও গহনা)" },
  { id: 'Personal Care & Accessories', name: 'Personal Care & Accessories', label: 'Personal Care & Accessories' },
  { id: 'Cookware & Dinnerware', name: 'Cookware & Dinnerware', label: 'Cookware & Dinnerware' },
  { id: 'General', name: 'General / Others', label: 'General / Others' },
];

const PRESET_TAGS = [
  'Daily Essential',
  'Hot Offer',
  'Popular',
  'Flash Sale',
  'Trending',
  'Best Value',
  'New Arrival',
  'Exclusive',
];

const emptyProductForm = {
  name: '',
  price: '',
  oldPrice: '',
  discount: '',
  category: 'kitchen',
  stock: 50,
  thumbnail: '',
  videoUrl: '',
  description: '',
  warranty: '12 Months Replacement',
  sku: '',
  tag: 'Daily Essential',
  rating: 5,
  reviews: 0,
  collections: {
    bestSelling: false,
    newArrival: true,
    hotOffer: false,
    popular: false,
  },
  variants: [
    {
      colorName: 'Standard',
      colorCode: '#3B82F6',
      images: [],
    },
  ],
};

// Client-side image compression & optimization (WebP/JPEG Data URL from local file)
const compressImageFile = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error(`File "${file.name}" is not a valid image format.`));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error(`Could not read image "${file.name}".`));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error(`Error reading file "${file.name}".`));
    reader.readAsDataURL(file);
  });
};

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [formData, setFormData] = useState(emptyProductForm);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Uploading state
  const [uploadingVariantIdx, setUploadingVariantIdx] = useState(null);
  const [dragOverVariantIdx, setDragOverVariantIdx] = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Inline editing stock
  const [editingStockId, setEditingStockId] = useState(null);
  const [tempStockValue, setTempStockValue] = useState('');

  // Category Collection state (dynamically fetched from MongoDB)
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState('');

  // ImgBB Permanent Storage configuration
  const [imgbbModalOpen, setImgbbModalOpen] = useState(false);
  const [imgbbKeyInput, setImgbbKeyInput] = useState(getImgBBApiKey());
  const [uploadProgressText, setUploadProgressText] = useState('');

  const loadCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      const res = await fetchCategoriesAPI();
      if (res?.categories && Array.isArray(res.categories) && res.categories.length > 0) {
        const formatted = res.categories.map((c) => ({
          id: c.id,
          name: c.name || c.label || c.id,
          label: c.name || c.label || c.id,
        }));
        setCategories(formatted);
      }
    } catch (err) {
      console.warn('Could not fetch categories from DB:', err);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Handle Add Category to MongoDB Collection
  const handleAddCategory = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newCategoryName.trim()) {
      setCategoryError('Category name is required.');
      return;
    }

    setSavingCategory(true);
    setCategoryError('');
    try {
      const res = await createCategoryAPI({
        name: newCategoryName.trim(),
      });

      if (res?.category) {
        const added = {
          id: res.category.id,
          name: res.category.name,
          label: res.category.name,
        };

        setCategories((prev) => {
          const exists = prev.some((c) => c.id === added.id);
          return exists ? prev : [...prev, added];
        });

        // Automatically select the new category in active product form
        setFormData((prev) => ({
          ...prev,
          category: added.id,
        }));

        setFeedback({
          type: 'success',
          message: `Category "${added.name}" added to database collection!`,
        });

        setNewCategoryName('');
        setCategoryModalOpen(false);
      }
    } catch (err) {
      setCategoryError(err.message || 'Failed to create category.');
    } finally {
      setSavingCategory(false);
    }
  };

  // Handle Delete Category from MongoDB Collection
  const handleDeleteCategory = async (catId, catName) => {
    if (!window.confirm(`Are you sure you want to delete category "${catName || catId}" from the database?`)) {
      return;
    }
    try {
      await deleteCategoryAPI(catId);
      setCategories((prev) => prev.filter((c) => c.id !== catId));
      setFeedback({
        type: 'success',
        message: `Category "${catName || catId}" deleted successfully.`,
      });
      setFormData((prev) => {
        if (prev.category === catId) {
          return { ...prev, category: categories.find((c) => c.id !== catId)?.id || 'kitchen' };
        }
        return prev;
      });
    } catch (err) {
      setCategoryError(err.message || 'Failed to delete category.');
    }
  };

  const loadProducts = useCallback(async () => {
    try {
      const data = await fetchAdminProductsAPI({
        search,
        category: selectedCategory,
        stockFilter,
      });
      setProducts(data || []);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load products.' });
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, stockFilter]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Handle Quick Stock Adjust (+1, -1, +5, -5)
  const handleStockDelta = async (productId, delta) => {
    try {
      const updated = await updateAdminProductStockAPI(productId, { delta });
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, stock: updated.stock } : p))
      );
      setFeedback({
        type: 'success',
        message: `Stock for product #${productId} updated to ${updated.stock} units.`,
      });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update stock.' });
    }
  };

  // Handle Direct Stock Input Save
  const handleSaveDirectStock = async (productId) => {
    const numericStock = parseInt(tempStockValue, 10);
    if (isNaN(numericStock) || numericStock < 0) {
      setEditingStockId(null);
      return;
    }

    try {
      const updated = await updateAdminProductStockAPI(productId, { stock: numericStock });
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, stock: updated.stock } : p))
      );
      setEditingStockId(null);
      setFeedback({
        type: 'success',
        message: `Stock updated to ${updated.stock} units.`,
      });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update stock.' });
    }
  };

  // Open Add Product Modal
  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      ...emptyProductForm,
      category: categories[0]?.id || 'kitchen',
      variants: [
        {
          colorName: 'Standard',
          colorCode: '#3B82F6',
          images: [],
        },
      ],
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Product Modal
  const openEditModal = (product) => {
    setEditingProduct(product);
    setIsAddModalOpen(true);

    let preparedVariants = [];
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      preparedVariants = product.variants.map((v) => ({
        colorName: v.colorName || 'Standard',
        colorCode: v.colorCode || '#3B82F6',
        images: Array.isArray(v.images) ? [...v.images] : [],
      }));
    } else {
      preparedVariants = [
        {
          colorName: 'Standard',
          colorCode: '#3B82F6',
          images: product.thumbnail ? [product.thumbnail] : [],
        },
      ];
    }

    setFormData({
      name: product.name || '',
      price: product.price !== undefined ? String(product.price) : '',
      oldPrice: product.oldPrice !== null && product.oldPrice !== undefined ? String(product.oldPrice) : '',
      discount: product.discount || '',
      category: product.category || categories[0]?.id || 'kitchen',
      stock: product.stock !== undefined ? product.stock : 50,
      thumbnail: product.thumbnail || preparedVariants[0]?.images?.[0] || '',
      videoUrl: product.videoUrl || '',
      description: product.description || '',
      warranty: product.warranty || '12 Months Replacement',
      sku: product.sku || '',
      tag: product.tag || 'Daily Essential',
      rating: product.rating !== undefined ? product.rating : 5,
      reviews: product.reviews || 0,
      collections: {
        bestSelling: Boolean(product.collections?.bestSelling),
        newArrival: Boolean(product.collections?.newArrival),
        hotOffer: Boolean(product.collections?.hotOffer),
        popular: Boolean(product.collections?.popular),
      },
      variants: preparedVariants,
    });
  };

  // Price & Auto-Discount Calculation
  const handlePriceChange = (val) => {
    const p = parseFloat(val);
    const op = parseFloat(formData.oldPrice);
    let autoDiscount = formData.discount;
    if (!isNaN(p) && !isNaN(op) && op > p && op > 0) {
      const pct = Math.round(((op - p) / op) * 100);
      autoDiscount = `-${pct}%`;
    }
    setFormData((prev) => ({
      ...prev,
      price: val,
      discount: autoDiscount,
    }));
  };

  const handleOldPriceChange = (val) => {
    const op = parseFloat(val);
    const p = parseFloat(formData.price);
    let autoDiscount = formData.discount;
    if (!isNaN(p) && !isNaN(op) && op > p && op > 0) {
      const pct = Math.round(((op - p) / op) * 100);
      autoDiscount = `-${pct}%`;
    } else if (!val) {
      autoDiscount = '';
    }
    setFormData((prev) => ({
      ...prev,
      oldPrice: val,
      discount: autoDiscount,
    }));
  };

  // --- IMGBB PERMANENT IMAGE UPLOAD PER VARIANT ---
  const handleVariantFilesSelected = async (vIdx, e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingVariantIdx(vIdx);
    setUploadProgressText(`Processing 1 of ${files.length} photo(s)...`);
    setFeedback({ type: '', message: '' });

    try {
      const uploadedUrls = [];
      for (let i = 0; i < files.length; i++) {
        setUploadProgressText(`Processing photo ${i + 1} of ${files.length}...`);
        const permUrl = await uploadImageToImgBB(files[i]);
        uploadedUrls.push(permUrl);
      }

      setFormData((prev) => {
        const updatedVariants = [...prev.variants];
        const targetVariant = updatedVariants[vIdx] || {
          colorName: 'Standard',
          colorCode: '#3B82F6',
          images: [],
        };

        const newImages = [...(targetVariant.images || []), ...uploadedUrls];
        updatedVariants[vIdx] = {
          ...targetVariant,
          images: newImages,
        };

        // If no main thumbnail set yet, use the first uploaded image
        const newThumbnail = prev.thumbnail || uploadedUrls[0] || '';

        return {
          ...prev,
          thumbnail: newThumbnail,
          variants: updatedVariants,
        };
      });

      const colorLabel = formData.variants[vIdx]?.colorName || `Color #${vIdx + 1}`;
      setFeedback({
        type: 'success',
        message: `Attached ${uploadedUrls.length} photo(s) successfully for "${colorLabel}".`,
      });
    } catch (err) {
      console.error('Image upload error:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to attach photo(s).',
      });
    } finally {
      setUploadingVariantIdx(null);
      setUploadProgressText('');
      if (e?.target) e.target.value = '';
    }
  };

  // Drag & drop upload for a specific variant
  const handleVariantDropFiles = async (vIdx, e) => {
    e.preventDefault();
    setDragOverVariantIdx(null);
    const files = Array.from(e.dataTransfer.files || []).filter((f) =>
      f.type.startsWith('image/')
    );
    if (files.length === 0) return;

    setUploadingVariantIdx(vIdx);
    setUploadProgressText(`Processing 1 of ${files.length} photo(s)...`);
    setFeedback({ type: '', message: '' });

    try {
      const uploadedUrls = [];
      for (let i = 0; i < files.length; i++) {
        setUploadProgressText(`Processing photo ${i + 1} of ${files.length}...`);
        const permUrl = await uploadImageToImgBB(files[i]);
        uploadedUrls.push(permUrl);
      }

      setFormData((prev) => {
        const updatedVariants = [...prev.variants];
        const targetVariant = updatedVariants[vIdx] || {
          colorName: 'Standard',
          colorCode: '#3B82F6',
          images: [],
        };

        const newImages = [...(targetVariant.images || []), ...uploadedUrls];
        updatedVariants[vIdx] = {
          ...targetVariant,
          images: newImages,
        };

        const newThumbnail = prev.thumbnail || uploadedUrls[0] || '';

        return {
          ...prev,
          thumbnail: newThumbnail,
          variants: updatedVariants,
        };
      });

      const colorLabel = formData.variants[vIdx]?.colorName || `Color #${vIdx + 1}`;
      setFeedback({
        type: 'success',
        message: `Attached ${uploadedUrls.length} dropped photo(s) successfully for "${colorLabel}".`,
      });
    } catch (err) {
      console.error('Image drop upload error:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to process dropped image files.',
      });
    } finally {
      setUploadingVariantIdx(null);
      setUploadProgressText('');
    }
  };

  // Delete an image from a specific color variant
  const handleRemoveVariantImage = (vIdx, imgIdx) => {
    setFormData((prev) => {
      const updatedVariants = [...prev.variants];
      const targetVariant = updatedVariants[vIdx];
      if (!targetVariant) return prev;

      const removedImg = targetVariant.images[imgIdx];
      const updatedImages = targetVariant.images.filter((_, i) => i !== imgIdx);
      updatedVariants[vIdx] = {
        ...targetVariant,
        images: updatedImages,
      };

      // If removed image was the active thumbnail, choose next available image
      let newThumbnail = prev.thumbnail;
      if (prev.thumbnail === removedImg) {
        newThumbnail = '';
        for (const v of updatedVariants) {
          if (v.images && v.images.length > 0) {
            newThumbnail = v.images[0];
            break;
          }
        }
      }

      return {
        ...prev,
        thumbnail: newThumbnail,
        variants: updatedVariants,
      };
    });
  };

  // Add an external/direct image URL to a variant
  const handleAddVariantImageUrl = (vIdx, url) => {
    const trimmed = (url || '').trim();
    if (!trimmed) return;

    setFormData((prev) => {
      const updatedVariants = [...prev.variants];
      const targetVariant = updatedVariants[vIdx] || {
        colorName: 'Standard',
        colorCode: '#3B82F6',
        images: [],
      };

      const newImages = [...(targetVariant.images || []), trimmed];
      updatedVariants[vIdx] = {
        ...targetVariant,
        images: newImages,
      };

      const newThumbnail = prev.thumbnail || trimmed;

      return {
        ...prev,
        thumbnail: newThumbnail,
        variants: updatedVariants,
      };
    });
  };

  // Direct Cover Photo Handlers
  const handleDirectThumbnailChange = (url) => {
    const trimmed = (url || '').trim();
    setFormData((prev) => {
      const updatedVariants = [...prev.variants];
      if (updatedVariants.length === 0) {
        updatedVariants.push({
          colorName: 'Standard',
          colorCode: '#3B82F6',
          images: trimmed ? [trimmed] : [],
        });
      } else if (trimmed) {
        const firstVariant = updatedVariants[0];
        const existingImages = firstVariant.images || [];
        if (!existingImages.includes(trimmed)) {
          updatedVariants[0] = {
            ...firstVariant,
            images: [trimmed, ...existingImages],
          };
        }
      }
      return {
        ...prev,
        thumbnail: trimmed,
        variants: updatedVariants,
      };
    });
  };

  const handleDirectCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    setFeedback({ type: '', message: '' });
    try {
      const permUrl = await uploadImageToImgBB(file);
      handleDirectThumbnailChange(permUrl);
      setFeedback({
        type: 'success',
        message: 'New cover photo uploaded and set as main product image successfully.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to upload cover photo.',
      });
    } finally {
      setUploadingCover(false);
      if (e.target) e.target.value = '';
    }
  };

  // Set an image as the main product thumbnail
  const handleSetMainThumbnail = (imgUrl) => {
    setFormData((prev) => ({
      ...prev,
      thumbnail: imgUrl,
    }));
    setFeedback({
      type: 'success',
      message: 'Set as the main product thumbnail for search, catalog, and cards.',
    });
  };

  // Color Variants Management
  const handleAddVariant = () => {
    const defaultColors = ['#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#000000'];
    const nextColor = defaultColors[formData.variants.length % defaultColors.length];

    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          colorName: '',
          colorCode: nextColor,
          images: [],
        },
      ],
    }));
  };

  const handleUpdateVariantField = (vIdx, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.variants];
      updated[vIdx] = { ...updated[vIdx], [field]: value };
      return { ...prev, variants: updated };
    });
  };

  const handleRemoveVariant = (vIdx) => {
    if (formData.variants.length <= 1) {
      setFeedback({
        type: 'error',
        message: 'A product must have at least one variant.',
      });
      return;
    }

    setFormData((prev) => {
      const updatedVariants = prev.variants.filter((_, i) => i !== vIdx);
      let newThumbnail = prev.thumbnail;
      const allRemainingImages = updatedVariants.flatMap((v) => v.images || []);
      if (!allRemainingImages.includes(newThumbnail)) {
        newThumbnail = allRemainingImages[0] || '';
      }
      return {
        ...prev,
        thumbnail: newThumbnail,
        variants: updatedVariants,
      };
    });
  };

  // Submit Product Form (Create or Edit)
  const handleSubmitProduct = async (e) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      setFeedback({
        type: 'error',
        message: 'Product name/title is required.',
      });
      return;
    }

    if (formData.price === '' || isNaN(Number(formData.price)) || Number(formData.price) < 0) {
      setFeedback({
        type: 'error',
        message: 'A valid product price (0 or higher) is required.',
      });
      return;
    }

    // Check that at least one photo has been uploaded across all variants or provided in thumbnail
    const allImages = formData.variants.flatMap((v) => v.images || []);
    const finalThumbnail = (formData.thumbnail || '').trim() || allImages[0] || '';

    if (!finalThumbnail && allImages.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Please upload or provide at least one product photo.',
      });
      return;
    }

    setSaving(true);
    setFeedback({ type: '', message: '' });

    // Clean variants array
    const cleanedVariants = formData.variants
      .filter((v) => v.colorName.trim() !== '' || (v.images && v.images.length > 0))
      .map((v) => ({
        colorName: v.colorName.trim() || 'Standard',
        colorCode: v.colorCode || '#3B82F6',
        images: Array.isArray(v.images) && v.images.length > 0 ? v.images : [finalThumbnail].filter(Boolean),
      }));

    if (cleanedVariants.length === 0) {
      cleanedVariants.push({
        colorName: 'Standard',
        colorCode: '#3B82F6',
        images: allImages.length > 0 ? allImages : [finalThumbnail].filter(Boolean),
      });
    }

    if (finalThumbnail && cleanedVariants[0] && !cleanedVariants[0].images.includes(finalThumbnail)) {
      cleanedVariants[0].images = [finalThumbnail, ...cleanedVariants[0].images];
    }

    const payload = {
      name: formData.name.trim(),
      price: Number(formData.price),
      oldPrice: formData.oldPrice ? Number(formData.oldPrice) : null,
      discount: formData.discount || '',
      category: formData.category || categories[0]?.id || 'kitchen',
      stock: Math.max(0, parseInt(formData.stock, 10) || 0),
      tag: formData.tag || '',
      sku: (formData.sku || '').trim(),
      warranty: formData.warranty || '12 Months Replacement',
      videoUrl: (formData.videoUrl || '').trim(),
      description: formData.description || '',
      thumbnail: finalThumbnail,
      images: finalThumbnail
        ? [finalThumbnail, ...allImages.filter((img) => img !== finalThumbnail)]
        : allImages,
      variants: cleanedVariants,
      rating: Math.min(5, Math.max(0, Number(formData.rating) || 5)),
      reviews: Math.max(0, parseInt(formData.reviews, 10) || 0),
      collections: {
        bestSelling: Boolean(formData.collections?.bestSelling),
        newArrival: Boolean(formData.collections?.newArrival),
        hotOffer: Boolean(formData.collections?.hotOffer),
        popular: Boolean(formData.collections?.popular),
      },
    };

    try {
      if (editingProduct) {
        const prodId = editingProduct.id !== undefined && editingProduct.id !== null ? editingProduct.id : editingProduct._id;
        const updated = await updateAdminProductAPI(prodId, payload);
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id || p._id === editingProduct._id ? { ...p, ...payload, ...updated } : p))
        );
        setEditingProduct(null);
        setIsAddModalOpen(false);
        setFeedback({
          type: 'success',
          message: `Product #${updated?.id || prodId} (${updated?.name || payload.name}) updated successfully in MongoDB.`,
        });
      } else {
        const created = await createAdminProductAPI(payload);
        setProducts((prev) => [created, ...prev]);
        setIsAddModalOpen(false);
        setEditingProduct(null);
        setFeedback({
          type: 'success',
          message: `Product #${created.id} (${created.name}) created successfully in MongoDB.`,
        });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save product.' });
    } finally {
      setSaving(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    setSaving(true);
    try {
      const prodId = deletingProduct.id !== undefined && deletingProduct.id !== null ? deletingProduct.id : deletingProduct._id;
      await deleteAdminProductAPI(prodId);
      setProducts((prev) => prev.filter((p) => p.id !== deletingProduct.id && p._id !== deletingProduct._id));
      setFeedback({
        type: 'success',
        message: `Product #${prodId} (${deletingProduct.name || ''}) deleted permanently from MongoDB.`,
      });
      setDeletingProduct(null);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete product.' });
    } finally {
      setSaving(false);
    }
  };

  // Total count of uploaded images across all variants
  const totalUploadedImagesCount = formData.variants.reduce(
    (acc, v) => acc + (v.images?.length || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* ---------------- PAGE HEADER ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Product Inventory & Real-Time Stock Control
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage catalog in MongoDB • Upload multiple local images per color variant • Instant stock replenishment
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => {
              setCategoryError('');
              setNewCategoryName('');
              setCategoryModalOpen(true);
            }}
            className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            title="Manage or add categories in MongoDB"
          >
            <FiLayers className="w-4 h-4 text-indigo-600" />
            <span>Manage Categories</span>
          </button>

          <button
            onClick={openAddModal}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <FiPlus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* ---------------- FEEDBACK BANNER ---------------- */}
      {feedback.message && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 border shadow-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <FiCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <FiAlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback({ type: '', message: '' })}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ---------------- FILTER & SEARCH BAR ---------------- */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <FiSearch className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, SKU, ID, or tag..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
          />
        </div>

        {/* Category Filter */}
        <div className="w-full md:w-60">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.label || c.id}
              </option>
            ))}
          </select>
        </div>

        {/* Stock Status Filter */}
        <div className="w-full md:w-44">
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
          >
            <option value="all">All Stock Levels</option>
            <option value="in">In Stock (10+)</option>
            <option value="low">Low Stock (&lt; 10)</option>
            <option value="out">Out of Stock (0)</option>
          </select>
        </div>

        {/* Refresh button */}
        <button
          onClick={loadProducts}
          title="Refresh products"
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 self-end md:self-auto transition-colors cursor-pointer"
        >
          <FiRefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ---------------- PRODUCTS TABLE ---------------- */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading live catalog from database...
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No products found matching your search and filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="py-3.5 px-4">Item & Variants</th>
                  <th className="py-3.5 px-4">Category & SKU</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Stock Status & Live Control</th>
                  <th className="py-3.5 px-4">Collections</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => {
                  const isLow = product.stock > 0 && product.stock < 10;
                  const isOut = product.stock <= 0;
                  const isEditingThisStock = editingStockId === product.id;
                  const variantCount = product.variants?.length || 1;
                  const totalImages =
                    product.variants?.reduce(
                      (acc, v) => acc + (v.images?.length || 0),
                      0
                    ) || (product.thumbnail ? 1 : 0);

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Product Thumbnail & Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <img
                              src={product.thumbnail}
                              alt={product.name}
                              className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200"
                              onError={(e) => {
                                e.target.src =
                                  'https://placehold.co/100x100/f1f5f9/64748b?text=No+Img';
                              }}
                            />
                            {totalImages > 1 && (
                              <span className="absolute -bottom-1 -right-1 bg-indigo-600 text-white font-bold text-[9px] px-1.5 py-0.2 rounded-full border border-white">
                                {totalImages}
                              </span>
                            )}
                          </div>
                          <div className="max-w-xs">
                            <h4 className="font-bold text-slate-900 text-xs truncate">
                              {product.name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="text-[10px] text-slate-500 font-mono">
                                ID: #{product.id}
                              </span>
                              {/* Color swatches preview */}
                              {product.variants && product.variants.length > 0 && (
                                <div className="flex items-center gap-1 ml-1">
                                  {product.variants.slice(0, 4).map((v, i) => (
                                    <span
                                      key={i}
                                      className="w-2.5 h-2.5 rounded-full border border-slate-300"
                                      style={{ backgroundColor: v.colorCode || '#3B82F6' }}
                                      title={v.colorName}
                                    />
                                  ))}
                                  {product.variants.length > 4 && (
                                    <span className="text-[9px] text-slate-400">
                                      +{product.variants.length - 4}
                                    </span>
                                  )}
                                </div>
                              )}
                              {product.videoUrl && (
                                <span
                                  className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded ml-1"
                                  title={`Showcase Video: ${product.videoUrl}`}
                                >
                                  <FiVideo className="w-2.5 h-2.5" />
                                  Video
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category & SKU */}
                      <td className="py-3.5 px-4">
                        <span className="text-slate-800 font-bold block truncate max-w-[180px]">
                          {categories.find((c) => c.id === product.category)?.name || product.category}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {product.sku || `SAR-${product.id}`}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-emerald-600 text-sm">
                          ৳{product.price}
                        </span>
                        {product.oldPrice && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 line-through">
                              ৳{product.oldPrice}
                            </span>
                            {product.discount && (
                              <span className="text-[9px] font-bold text-rose-600">
                                {product.discount}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Live Stock Control */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {/* Stock Status Badge */}
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isOut
                                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                : isLow
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isOut ? 'Out of Stock' : `${product.stock} units`}
                          </span>

                          {/* Inline Controls */}
                          {isEditingThisStock ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                autoFocus
                                value={tempStockValue}
                                onChange={(e) => setTempStockValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveDirectStock(product.id);
                                  if (e.key === 'Escape') setEditingStockId(null);
                                }}
                                className="w-16 bg-white border border-indigo-500 rounded px-2 py-0.5 text-xs text-slate-900"
                              />
                              <button
                                onClick={() => handleSaveDirectStock(product.id)}
                                className="p-1 rounded bg-emerald-600 text-white cursor-pointer"
                                title="Save Stock"
                              >
                                <FiCheck className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingStockId(null)}
                                className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                                title="Cancel"
                              >
                                <FiX className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleStockDelta(product.id, -1)}
                                disabled={product.stock <= 0}
                                title="Decrease stock -1"
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs disabled:opacity-30 border border-slate-300 transition-colors cursor-pointer"
                              >
                                -1
                              </button>
                              <button
                                onClick={() => handleStockDelta(product.id, 1)}
                                title="Increase stock +1"
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-300 transition-colors cursor-pointer"
                              >
                                +1
                              </button>
                              <button
                                onClick={() => handleStockDelta(product.id, 5)}
                                title="Increase stock +5"
                                className="px-1.5 h-6 rounded bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white flex items-center justify-center font-bold text-[10px] border border-indigo-200 transition-colors cursor-pointer"
                              >
                                +5
                              </button>
                              <button
                                onClick={() => {
                                  setEditingStockId(product.id);
                                  setTempStockValue(String(product.stock));
                                }}
                                title="Edit exact quantity"
                                className="text-[10px] text-slate-500 hover:text-slate-900 px-1 underline cursor-pointer"
                              >
                                Set
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Collections badges */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {product.collections?.bestSelling && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">
                              Best Seller
                            </span>
                          )}
                          {product.collections?.newArrival && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-bold">
                              New
                            </span>
                          )}
                          {product.collections?.hotOffer && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-bold">
                              Hot Deal
                            </span>
                          )}
                          {product.collections?.popular && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold">
                              Popular
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
                            title="Edit Product Details & Photos"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingProduct(product)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-200 transition-colors cursor-pointer"
                            title="Delete Permanently"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------- ADD / EDIT PRODUCT MODAL ---------------- */}
      {(isAddModalOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 rounded-t-2xl">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {editingProduct
                    ? `Edit Product #${editingProduct.id}: ${editingProduct.name}`
                    : 'Add New Product to Store Catalog'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Upload multiple local images per color variant • Select main cover with 1-click star
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingProduct(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmitProduct} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {/* SECTION 1: BASIC INFORMATION */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Product Title / Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. ট্যাপ ওয়াটার ফিল্টার - 360° রোটেটিং কিচেন কল ফিল্টার"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Category *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryError('');
                          setNewCategoryName('');
                          setCategoryModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                      >
                        <FiPlus className="w-3 h-3" />
                        <span>Add Category</span>
                      </button>
                    </div>
                    <div className="flex gap-1.5">
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name || c.label || c.id}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryError('');
                          setNewCategoryName('');
                          setCategoryModalOpen(true);
                        }}
                        title="Add more category to database collection"
                        className="px-2.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        <FiPlus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Promotional Tag
                    </label>
                    <div className="flex gap-1.5">
                      <select
                        value={PRESET_TAGS.includes(formData.tag) ? formData.tag : 'custom'}
                        onChange={(e) => {
                          if (e.target.value === 'custom') {
                            setFormData({ ...formData, tag: '' });
                          } else {
                            setFormData({ ...formData, tag: e.target.value });
                          }
                        }}
                        className="w-1/2 bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                      >
                        {PRESET_TAGS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                        <option value="custom">Custom...</option>
                      </select>
                      <input
                        type="text"
                        value={formData.tag}
                        onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                        placeholder="Tag name"
                        className="w-1/2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      SKU Code
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="Auto-generated if empty (SAR-XXX)"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: PRICING, DISCOUNT & INVENTORY */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Pricing, Discount & Stock Level
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Selling Price (৳) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.price}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      placeholder="e.g. 150"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Original Price (৳)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.oldPrice}
                      onChange={(e) => handleOldPriceChange(e.target.value)}
                      placeholder="e.g. 200"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Discount Badge
                    </label>
                    <input
                      type="text"
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                      placeholder="e.g. -25%"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-rose-600 font-bold placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Available Stock *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      placeholder="50"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Warranty Policy
                    </label>
                    <input
                      type="text"
                      value={formData.warranty}
                      onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                      placeholder="12 Months Replacement"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Rating (0 to 5)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      value={formData.rating}
                      onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                      placeholder="5"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Total Reviews Count
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.reviews}
                      onChange={(e) => setFormData({ ...formData, reviews: e.target.value })}
                      placeholder="0"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2.5: MAIN STOREFRONT COVER PHOTO (প্রধান ছবি) */}
              <div className="p-4 sm:p-5 rounded-2xl border-2 border-amber-300 bg-amber-50/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <FiStar className="w-4 h-4 text-amber-600 fill-amber-500" />
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Main Storefront Cover Photo (প্রধান ছবি / Thumbnail) *
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      This is the main image displayed across the storefront, home page, search, and catalog.
                    </p>
                  </div>

                  {formData.thumbnail && (
                    <span className="self-start sm:self-auto text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                      Cover Active
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Visual Preview */}
                  <div className="relative w-24 h-24 rounded-xl border-2 border-slate-300 bg-white overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                    {formData.thumbnail ? (
                      <img
                        src={formData.thumbnail}
                        alt="Product Cover Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://placehold.co/100x100/f1f5f9/64748b?text=Cover';
                        }}
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <FiImage className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                        <span className="text-[9px] font-bold block leading-tight">No Cover Set</span>
                      </div>
                    )}
                  </div>

                  {/* Input & Direct Upload Buttons */}
                  <div className="flex-1 space-y-2 w-full">
                    <label className="block text-xs font-bold text-slate-700">
                      Cover Photo URL (Image URL লিখুন অথবা সরাসরি ছবি আপলোড করুন):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={formData.thumbnail}
                        onChange={(e) => handleDirectThumbnailChange(e.target.value)}
                        placeholder="https://... (Direct image link)"
                        className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-amber-500"
                      />
                      <input
                        id="main-cover-file-input"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        onChange={handleDirectCoverUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={uploadingCover}
                        onClick={() => document.getElementById('main-cover-file-input')?.click()}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0 disabled:opacity-60"
                        title="Upload a new cover photo directly from your device"
                      >
                        {uploadingCover ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <FiUploadCloud className="w-4 h-4" />
                            <span>Upload Cover</span>
                          </>
                        )}
                      </button>
                      {formData.thumbnail && (
                        <button
                          type="button"
                          onClick={() => handleDirectThumbnailChange('')}
                          className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-bold transition-colors cursor-pointer shrink-0"
                          title="Clear cover photo"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      You can also click the star icon (<span className="text-amber-500 font-bold">★</span>) on any uploaded variant photo below to set it as cover.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 3: COLOR VARIANTS & LOCAL MULTIPLE IMAGES UPLOAD */}
              <div className="p-4 sm:p-5 rounded-2xl border-2 border-indigo-200 bg-indigo-50/20 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <FiImage className="w-5 h-5 text-indigo-600" />
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                        Color Variants & Multiple Photo Uploads (কালার ও ছবি) *
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Upload multiple images from your device for each color • Click star ★ on any photo to set as main storefront cover
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setImgbbKeyInput(getImgBBApiKey());
                        setImgbbModalOpen(true);
                      }}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      title="Configure ImgBB API Key for permanent image uploads"
                    >
                      <FiKey className="w-3.5 h-3.5 text-amber-600" />
                      <span>ImgBB Key</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                    >
                      <FiPlus className="w-4 h-4" />
                      <span>Add Another Color Variant</span>
                    </button>
                  </div>
                </div>

                {/* Variants List */}
                <div className="space-y-5">
                  {formData.variants.map((variant, vIdx) => {
                    const isUploadingThis = uploadingVariantIdx === vIdx;
                    const isDraggingThis = dragOverVariantIdx === vIdx;
                    const fileInputId = `variant-upload-input-${vIdx}`;

                    return (
                      <div
                        key={vIdx}
                        className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3"
                      >
                        {/* Variant Header: Color Swatch, Color Name, Remove */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-3 flex-1">
                            {/* Color Picker Swatch */}
                            <div className="flex items-center gap-2">
                              <label
                                htmlFor={`color-picker-${vIdx}`}
                                className="text-xs font-bold text-slate-700 cursor-pointer"
                              >
                                Color:
                              </label>
                              <div className="relative flex items-center">
                                <input
                                  id={`color-picker-${vIdx}`}
                                  type="color"
                                  value={variant.colorCode || '#3B82F6'}
                                  onChange={(e) =>
                                    handleUpdateVariantField(vIdx, 'colorCode', e.target.value)
                                  }
                                  className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-transparent"
                                />
                                <span className="text-[11px] font-mono text-slate-500 ml-1.5">
                                  {variant.colorCode || '#3B82F6'}
                                </span>
                              </div>
                            </div>

                            {/* Color Name Input */}
                            <div className="flex-1 max-w-xs">
                              <input
                                type="text"
                                required
                                value={variant.colorName}
                                onChange={(e) =>
                                  handleUpdateVariantField(vIdx, 'colorName', e.target.value)
                                }
                                placeholder="Color name (e.g. Standard, Red, Navy Blue)"
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <span className="text-[11px] font-semibold text-slate-500">
                              {variant.images?.length || 0} photo(s)
                            </span>
                            {formData.variants.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveVariant(vIdx)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Remove this color variant"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Local File Upload Dropzone for this Variant */}
                        <div>
                          <input
                            id={fileInputId}
                            type="file"
                            multiple
                            accept="image/png,image/jpeg,image/webp,image/jpg"
                            onChange={(e) => handleVariantFilesSelected(vIdx, e)}
                            className="hidden"
                          />

                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragOverVariantIdx(vIdx);
                            }}
                            onDragLeave={() => setDragOverVariantIdx(null)}
                            onDrop={(e) => handleVariantDropFiles(vIdx, e)}
                            onClick={() => document.getElementById(fileInputId)?.click()}
                            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                              isDraggingThis
                                ? 'border-indigo-600 bg-indigo-50'
                                : 'border-slate-300 hover:border-indigo-500 bg-slate-50/60 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                {isUploadingThis ? (
                                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <FiUploadCloud className="w-5 h-5" />
                                )}
                              </div>
                              <div className="text-left">
                                <p className="text-xs font-bold text-slate-800">
                                  {isUploadingThis
                                    ? (uploadProgressText || 'Processing & uploading photos...')
                                    : `Upload Photos for "${variant.colorName || 'this color'}"`}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  Select or drop files • Automatically optimized & attached permanently
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Direct Image URL input option */}
                          <div className="flex items-center gap-2 mt-2">
                            <input
                              type="url"
                              id={`url-input-${vIdx}`}
                              placeholder="Or paste direct image URL (https://...)"
                              className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddVariantImageUrl(vIdx, e.currentTarget.value);
                                  e.currentTarget.value = '';
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById(`url-input-${vIdx}`);
                                if (input && input.value.trim()) {
                                  handleAddVariantImageUrl(vIdx, input.value.trim());
                                  input.value = '';
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors shrink-0 cursor-pointer"
                            >
                              + Add URL
                            </button>
                          </div>
                        </div>

                        {/* Photos Gallery for this Variant */}
                        {variant.images && variant.images.length > 0 && (
                          <div className="pt-2">
                            <p className="text-[11px] font-bold text-slate-600 mb-2">
                              Uploaded Photos for {variant.colorName || 'this variant'}:
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                              {variant.images.map((img, imgIdx) => {
                                const isMainThumbnail = formData.thumbnail === img;

                                return (
                                  <div
                                    key={imgIdx}
                                    className={`group relative rounded-xl overflow-hidden border-2 bg-white transition-all ${
                                      isMainThumbnail
                                        ? 'border-amber-500 ring-2 ring-amber-400/30 shadow-md'
                                        : 'border-slate-200 hover:border-slate-400'
                                    }`}
                                  >
                                    <img
                                      src={img}
                                      alt={`${variant.colorName} photo ${imgIdx + 1}`}
                                      className="w-full h-24 object-cover"
                                      onError={(e) => {
                                        e.target.src =
                                          'https://placehold.co/100x100/f1f5f9/64748b?text=Broken';
                                      }}
                                    />

                                    {/* Main Cover Badge or Index */}
                                    <div className="absolute top-1 left-1">
                                      {isMainThumbnail ? (
                                        <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                                          <FiStar className="w-2.5 h-2.5 fill-current" /> Cover
                                        </span>
                                      ) : (
                                        <span className="bg-slate-900/70 text-white text-[9px] font-mono px-1 rounded shadow">
                                          #{imgIdx + 1}
                                        </span>
                                      )}
                                    </div>

                                    {/* Hover Actions */}
                                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                                      {!isMainThumbnail && (
                                        <button
                                          type="button"
                                          onClick={() => handleSetMainThumbnail(img)}
                                          title="Set as Main Storefront Cover"
                                          className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-[10px] font-bold transition-colors cursor-pointer"
                                        >
                                          <FiStar className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveVariantImage(vIdx, imgIdx)}
                                        title="Delete this photo"
                                        className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold transition-colors cursor-pointer"
                                      >
                                        <FiTrash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 4: PRODUCT DESCRIPTION */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Product Description & Key Highlights (বিবরণ)
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="সহজেই কিচেনের যেকোনো পানির কলে সেট করা যায়। পানি পরিষ্কার ও ব্যাকটেরিয়ামুক্ত রাখতে কার্যকর..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white leading-relaxed"
                />
              </div>

              {/* SECTION: PRODUCT SHOWCASE VIDEO */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <FiVideo className="w-4 h-4 text-rose-600" />
                    Product Showcase Video (ভিডিও ডেমো লিঙ্ক)
                  </label>
                  {formData.videoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, videoUrl: '' }))}
                      className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 underline cursor-pointer"
                    >
                      Clear Link
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="url"
                    value={formData.videoUrl}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                    placeholder="e.g. https://www.youtube.com/watch?v=... or https://youtu.be/... or embed URL"
                    className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-mono"
                  />
                  <FiVideo className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Paste a YouTube URL (watch, shorts, youtu.be, embed) or Vimeo link. Customers will see a red &quot;Watch video&quot; button on the product details page to watch this video.
                </p>
              </div>

              {/* SECTION 5: COLLECTIONS BADGES */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Highlight in Store Collections:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    { key: 'bestSelling', label: 'Best Selling' },
                    { key: 'newArrival', label: 'New Arrival' },
                    { key: 'hotOffer', label: 'Hot Offer' },
                    { key: 'popular', label: 'Popular Hits' },
                  ].map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-slate-400 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.collections[key]}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            collections: {
                              ...formData.collections,
                              [key]: e.target.checked,
                            },
                          })
                        }
                        className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-slate-800 font-semibold">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* SECTION 6: LIVE STOREFRONT CARD PREVIEW */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FiEye className="w-4 h-4 text-indigo-600" />
                  <span>Customer Storefront Live Card Preview</span>
                </h4>
                <div className="max-w-xs mx-auto bg-white rounded-2xl border border-slate-200 p-3 shadow-md space-y-2">
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                    <img
                      src={formData.thumbnail || 'https://placehold.co/400x400/f8fafc/64748b?text=Upload+Photo'}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    {formData.discount && (
                      <span className="absolute top-2 left-2 bg-rose-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow">
                        {formData.discount}
                      </span>
                    )}
                    {formData.tag && (
                      <span className="absolute top-2 right-2 bg-indigo-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-full shadow">
                        {formData.tag}
                      </span>
                    )}
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs line-clamp-2">
                      {formData.name || 'Your Product Title Goes Here'}
                    </h5>
                    {/* Color dots preview */}
                    {formData.variants && formData.variants.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5">
                        {formData.variants.map((v, i) => (
                          <span
                            key={i}
                            className="w-3 h-3 rounded-full border border-slate-300 shadow-2xs"
                            style={{ backgroundColor: v.colorCode || '#3B82F6' }}
                            title={v.colorName}
                          />
                        ))}
                      </div>
                    )}
                    <div className="flex items-baseline gap-2 mt-1.5">
                      <span className="text-base font-black text-emerald-600">
                        ৳{formData.price || '0'}
                      </span>
                      {formData.oldPrice && (
                        <span className="text-xs text-slate-400 line-through">
                          ৳{formData.oldPrice}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between sticky bottom-0 bg-white py-2">
                <span className="text-xs text-slate-500">
                  Total Photos: <strong className="text-slate-900">{totalUploadedImagesCount}</strong>
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setEditingProduct(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || uploadingVariantIdx !== null}
                    className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {saving
                      ? 'Saving to MongoDB...'
                      : editingProduct
                      ? 'Update Product'
                      : 'Create Product'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- DELETE CONFIRMATION MODAL ---------------- */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-rose-300 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <FiAlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-extrabold text-slate-900">
                Permanently Delete Product?
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Are you sure you want to remove{' '}
              <strong className="text-slate-900">
                #{deletingProduct.id} ({deletingProduct.name})
              </strong>{' '}
              from the MongoDB catalog? This action cannot be reversed.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleDeleteProduct}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {saving ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- CATEGORY COLLECTION MANAGEMENT MODAL ---------------- */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <FiLayers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Category Collection Management
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Add new categories to MongoDB database collection
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCategoryModalOpen(false);
                  setCategoryError('');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Error Feedback */}
            {categoryError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <FiAlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{categoryError}</span>
              </div>
            )}

            {/* Add Category Form */}
            <form onSubmit={handleAddCategory} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Kitchen & Dining, মেলামাইন, Smart Gadgets"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white font-medium"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Category ID will be generated automatically in MongoDB.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryModalOpen(false);
                    setCategoryError('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={savingCategory || !newCategoryName.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {savingCategory ? (
                    <>
                      <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to DB...</span>
                    </>
                  ) : (
                    <>
                      <FiPlus className="w-3.5 h-3.5" />
                      <span>Add Category to Collection</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* List of Existing Categories in MongoDB */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-slate-700">
                  Categories in Database ({categories.length})
                </span>
                {categoriesLoading && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <FiRefreshCw className="w-3 h-3 animate-spin" /> Syncing...
                  </span>
                )}
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-slate-800 truncate">
                        {cat.name || cat.label || cat.id}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 truncate">
                        ID: {cat.id}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, category: cat.id }));
                          setCategoryModalOpen(false);
                          setFeedback({
                            type: 'success',
                            message: `Selected category: "${cat.name || cat.id}"`,
                          });
                        }}
                        className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        Select
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete category from database"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ---------------- IMGBB PERMANENT STORAGE CONFIGURATION MODAL ---------------- */}
      {imgbbModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <FiKey className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    ImgBB Permanent Storage
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Permanent image hosting for product photos (never expires)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImgbbModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ImgBB API Key
                </label>
                <input
                  type="text"
                  value={imgbbKeyInput}
                  onChange={(e) => setImgbbKeyInput(e.target.value)}
                  placeholder="e.g. 7a8b9c0d1e2f3a4b5c6d..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3 text-[11px] text-slate-700 leading-relaxed">
                <p className="font-bold text-amber-900 mb-1">How Permanent Upload Works:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>Uploads directly to <code className="bg-white px-1 py-0.5 rounded text-indigo-700 font-mono">https://api.imgbb.com/1/upload</code></li>
                  <li>No expiration is set, so ImgBB sets <span className="font-bold text-emerald-700">expiration: 0</span> (permanent hosting).</li>
                  <li>Free API keys available instantly at <a href="https://api.imgbb.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold underline">api.imgbb.com</a>.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setImgbbModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImgBBApiKey(imgbbKeyInput);
                    setImgbbModalOpen(false);
                    setFeedback({
                      type: 'success',
                      message: imgbbKeyInput.trim()
                        ? 'ImgBB API Key saved! Images will now be uploaded permanently to ImgBB (never expires).'
                        : 'ImgBB API Key cleared.',
                    });
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-colors cursor-pointer"
                >
                  Save API Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;

