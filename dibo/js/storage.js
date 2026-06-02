// ========================================
// DIBO Store - Storage Operations
// ========================================

const Storage = {
    // Upload product image
    async uploadProductImage(productId, file) {
        try {
            // Compress image
            const compressedBlob = await Utils.compressImage(file, 600, 0.7);
            
            // Create storage reference
            const storageRef = storage.ref(`products/${productId}/${Date.now()}.jpg`);
            
            // Upload
            const snapshot = await storageRef.put(compressedBlob);
            
            // Get download URL
            const downloadUrl = await snapshot.ref.getDownloadURL();
            
            return downloadUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    },

    // Delete product image
    async deleteProductImage(imageUrl) {
        try {
            const storageRef = storage.refFromURL(imageUrl);
            await storageRef.delete();
            return true;
        } catch (error) {
            console.error('Error deleting image:', error);
            return false;
        }
    },

    // Get placeholder image
    getPlaceholder() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0zNSA2NUw0NSA1NUw1NSA2NUw3MCA1MEw3NSA1NVY3NUgyNVY2NUwzNSA2NVoiIGZpbGw9IiM5Q0EzQUYiLz4KPGNpcmNsZSBjeD0iNDAiIGN5PSIzNSIgcj0iOCIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
    }
};
