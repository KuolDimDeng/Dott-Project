import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    equipment_type: 'truck',
    make: '',
    model: '',
    year: '',
    vin: '',
    license_plate: '',
    status: 'active',
    purchase_date: '',
    purchase_price: '',
    current_value: '',
    notes: ''
  });

  // Simulated data loading
  useEffect(() => {
    // Simulate fetching data from API
    setTimeout(() => {
      const mockVehicles = [
        {
          id: '1',
          name: 'Freightliner Cascadia',
          equipment_type: 'truck',
          make: 'Freightliner',
          model: 'Cascadia 126',
          year: 2022,
          vin: '1FUJGLDV2NLPS5397',
          license_plate: 'TRK-1234',
          status: 'active',
          purchase_date: '2022-05-15',
          purchase_price: 150000,
          current_value: 142000,
          notes: 'Primary long-haul truck',
          maintenance_due: false,
          compliance_issues: false
        },
        {
          id: '2',
          name: 'Great Dane Trailer',
          equipment_type: 'trailer',
          make: 'Great Dane',
          model: 'Champion',
          year: 2021,
          vin: '1GRAA06209F123456',
          license_plate: 'TRL-5678',
          status: 'active',
          purchase_date: '2021-08-10',
          purchase_price: 65000,
          current_value: 60000,
          notes: 'Refrigerated trailer',
          maintenance_due: true,
          compliance_issues: false
        },
        {
          id: '3',
          name: 'Transit Van 250',
          equipment_type: 'van',
          make: 'Ford',
          model: 'Transit 250',
          year: 2023,
          vin: '1FTBW2CM9NKB01234',
          license_plate: 'VAN-9012',
          status: 'maintenance',
          purchase_date: '2023-01-20',
          purchase_price: 45000,
          current_value: 43000,
          notes: 'Local delivery van',
          maintenance_due: true,
          compliance_issues: true
        }
      ];
      
      setVehicles(mockVehicles);
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleOpenDialog = (vehicle = null) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        name: vehicle.name,
        equipment_type: vehicle.equipment_type,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        vin: vehicle.vin,
        license_plate: vehicle.license_plate,
        status: vehicle.status,
        purchase_date: vehicle.purchase_date,
        purchase_price: vehicle.purchase_price,
        current_value: vehicle.current_value,
        notes: vehicle.notes
      });
    } else {
      setEditingVehicle(null);
      setFormData({
        name: '',
        equipment_type: 'truck',
        make: '',
        model: '',
        year: '',
        vin: '',
        license_plate: '',
        status: 'active',
        purchase_date: '',
        purchase_price: '',
        current_value: '',
        notes: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = () => {
    if (editingVehicle) {
      // Simulate updating vehicle
      const updatedVehicles = vehicles.map(vehicle => 
        vehicle.id === editingVehicle.id ? { ...vehicle, ...formData } : vehicle
      );
      setVehicles(updatedVehicles);
    } else {
      // Simulate adding new vehicle
      const newVehicle = {
        id: String(vehicles.length + 1),
        ...formData,
        maintenance_due: false,
        compliance_issues: false
      };
      setVehicles([...vehicles, newVehicle]);
    }
    
    handleCloseDialog();
  };

  const handleDelete = (id) => {
    // Simulate deleting vehicle
    setVehicles(vehicles.filter(vehicle => vehicle.id !== id));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'maintenance':
        return 'warning';
      case 'out_of_service':
        return 'error';
      case 'retired':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'maintenance':
        return 'In Maintenance';
      case 'out_of_service':
        return 'Out of Service';
      case 'retired':
        return 'Retired';
      default:
        return status;
    }
  };

  const getVehicleTypeLabel = (type) => {
    switch (type) {
      case 'truck':
        return 'Truck';
      case 'trailer':
        return 'Trailer';
      case 'van':
        return 'Van';
      case 'forklift':
        return 'Forklift';
      case 'container':
        return 'Container';
      case 'other':
        return 'Other';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Vehicle Management</h1>
        <button 
          className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors"
          onClick={() => handleOpenDialog()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Vehicle
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Make/Model</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Plate</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alerts</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vehicle.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getVehicleTypeLabel(vehicle.equipment_type)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{`${vehicle.make} ${vehicle.model}`}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.year}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      vehicle.status === 'active' ? 'bg-green-100 text-green-800' : 
                      vehicle.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' : 
                      vehicle.status === 'out_of_service' ? 'bg-red-100 text-red-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getStatusLabel(vehicle.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.license_plate}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-1">
                      {vehicle.maintenance_due && (
                        <div className="group relative">
                          <button className="p-1 text-amber-600 rounded hover:bg-amber-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <span className="absolute z-10 invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 -mt-10 left-1/2 transform -translate-x-1/2">
                            Maintenance Due
                          </span>
                        </div>
                      )}
                      {vehicle.compliance_issues && (
                        <div className="group relative">
                          <button className="p-1 text-red-600 rounded hover:bg-red-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <span className="absolute z-10 invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 -mt-10 left-1/2 transform -translate-x-1/2">
                            Compliance Issues
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleOpenDialog(vehicle)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDelete(vehicle.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Vehicle Dialog */}
      <Transition.Root show={openDialog} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={handleCloseDialog}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 w-full max-w-4xl">
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                        <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                          {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                        </Dialog.Title>
                        <div className="mt-4 w-full">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-6">
                              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                Vehicle Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                name="name"
                                id="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                required
                              />
                            </div>
                            <div className="md:col-span-6">
                              <label htmlFor="equipment_type" className="block text-sm font-medium text-gray-700">
                                Vehicle Type
                              </label>
                              <select
                                id="equipment_type"
                                name="equipment_type"
                                value={formData.equipment_type}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                              >
                                <option value="truck">Truck</option>
                                <option value="trailer">Trailer</option>
                                <option value="van">Van</option>
                                <option value="forklift">Forklift</option>
                                <option value="container">Container</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                            <div className="md:col-span-4">
                              <label htmlFor="make" className="block text-sm font-medium text-gray-700">
                                Make
                              </label>
                              <input
                                type="text"
                                name="make"
                                id="make"
                                value={formData.make}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              />
                            </div>
                            <div className="md:col-span-4">
                              <label htmlFor="model" className="block text-sm font-medium text-gray-700">
                                Model
                              </label>
                              <input
                                type="text"
                                name="model"
                                id="model"
                                value={formData.model}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              />
                            </div>
                            <div className="md:col-span-4">
                              <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                                Year
                              </label>
                              <input
                                type="number"
                                name="year"
                                id="year"
                                value={formData.year}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              />
                            </div>
                            <div className="md:col-span-6">
                              <label htmlFor="vin" className="block text-sm font-medium text-gray-700">
                                VIN/Serial Number
                              </label>
                              <input
                                type="text"
                                name="vin"
                                id="vin"
                                value={formData.vin}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              />
                            </div>
                            <div className="md:col-span-6">
                              <label htmlFor="license_plate" className="block text-sm font-medium text-gray-700">
                                License Plate
                              </label>
                              <input
                                type="text"
                                name="license_plate"
                                id="license_plate"
                                value={formData.license_plate}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              />
                            </div>
                            <div className="md:col-span-4">
                              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                                Status
                              </label>
                              <select
                                id="status"
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                              >
                                <option value="active">Active</option>
                                <option value="maintenance">In Maintenance</option>
                                <option value="out_of_service">Out of Service</option>
                                <option value="retired">Retired</option>
                              </select>
                            </div>
                            <div className="md:col-span-4">
                              <label htmlFor="purchase_date" className="block text-sm font-medium text-gray-700">
                                Purchase Date
                              </label>
                              <input
                                type="date"
                                name="purchase_date"
                                id="purchase_date"
                                value={formData.purchase_date}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              />
                            </div>
                            <div className="md:col-span-4">
                              <label htmlFor="purchase_price" className="block text-sm font-medium text-gray-700">
                                Purchase Price
                              </label>
                              <input
                                type="number"
                                name="purchase_price"
                                id="purchase_price"
                                value={formData.purchase_price}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              />
                            </div>
                            <div className="md:col-span-12">
                              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                                Notes
                              </label>
                              <textarea
                                id="notes"
                                name="notes"
                                rows={3}
                                value={formData.notes}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                    <button
                      type="button"
                      className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={handleSubmit}
                    >
                      {editingVehicle ? 'Update' : 'Add'}
                    </button>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                      onClick={handleCloseDialog}
                    >
                      Cancel
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
};

export default VehicleManagement; 