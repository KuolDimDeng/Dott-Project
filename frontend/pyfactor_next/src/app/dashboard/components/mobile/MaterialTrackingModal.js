import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import { jobService } from '@/services/jobService';

const MaterialTrackingModal = ({ jobId, customerName, onClose, onSave }) => {
  const [availableSupplies, setAvailableSupplies] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAvailableSupplies();
  }, []);

  const fetchAvailableSupplies = async () => {
    try {
      const supplies = await jobService.getAvailableSupplies();
      setAvailableSupplies(supplies);
    } catch (error) {
      console.error('Error fetching supplies:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSupplies = availableSupplies.filter(supply =>
    supply.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supply.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addMaterial = (supply) => {
    const existing = selectedMaterials.find(m => m.supply_id === supply.id);
    if (existing) {
      setSelectedMaterials(prev =>
        prev.map(m =>
          m.supply_id === supply.id
            ? { ...m, quantity: m.quantity + 1 }
            : m
        )
      );
    } else {
      setSelectedMaterials(prev => [...prev, {
        supply_id: supply.id,
        supply_name: supply.name,
        quantity: 1,
        unit_cost: supply.cost || 0,
        unit_price: supply.price || supply.cost * 1.2 || 0,
        notes: ''
      }]);
    }
  };

  const updateQuantity = (supplyId, change) => {
    setSelectedMaterials(prev =>
      prev.map(m =>
        m.supply_id === supplyId
          ? { ...m, quantity: Math.max(0, m.quantity + change) }
          : m
      ).filter(m => m.quantity > 0)
    );
  };

  const updateNotes = (supplyId, notes) => {
    setSelectedMaterials(prev =>
      prev.map(m =>
        m.supply_id === supplyId ? { ...m, notes } : m
      )
    );
  };

  const saveMaterials = () => {
    if (selectedMaterials.length === 0) {
      alert('Please select at least one material.');
      return;
    }
    onSave(selectedMaterials);
  };

  const getTotalValue = () => {
    return selectedMaterials.reduce((total, material) => 
      total + (material.quantity * material.unit_price), 0
    ).toFixed(2);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Track Materials</h3>
            <p className="text-sm text-gray-600">{customerName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Selected Materials */}
        {selectedMaterials.length > 0 && (
          <div className="p-4 bg-blue-50 border-b border-gray-200">
            <h4 className="font-medium text-gray-900 mb-2">Selected Materials</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {selectedMaterials.map((material) => (
                <div key={material.supply_id} className="flex items-center justify-between bg-white rounded p-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{material.supply_name}</p>
                    <p className="text-xs text-gray-500">
                      ${material.unit_price} × {material.quantity} = ${(material.unit_price * material.quantity).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(material.supply_id, -1)}
                      className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center"
                    >
                      <MinusIcon className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-sm">{material.quantity}</span>
                    <button
                      onClick={() => updateQuantity(material.supply_id, 1)}
                      className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center"
                    >
                      <PlusIcon className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-right">
              <p className="text-sm font-medium">Total: ${getTotalValue()}</p>
            </div>
          </div>
        )}

        {/* Available Materials */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">Available Materials</h4>
            {filteredSupplies.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No materials found</p>
            ) : (
              <div className="space-y-2">
                {filteredSupplies.map((supply) => (
                  <div
                    key={supply.id}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{supply.name}</p>
                        <p className="text-sm text-gray-500">SKU: {supply.sku}</p>
                        <p className="text-sm text-green-600">${supply.price || supply.cost || 0}</p>
                        {supply.current_stock !== undefined && (
                          <p className="text-xs text-gray-400">
                            Stock: {supply.current_stock} {supply.unit}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => addMaterial(supply)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={saveMaterials}
              disabled={selectedMaterials.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Materials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialTrackingModal;