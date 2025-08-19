'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  XMarkIcon, 
  PlusIcon, 
  MinusIcon, 
  TrashIcon,
  CreditCardIcon,
  BanknotesIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';

export default function MobileCart({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  subtotal,
  tax,
  total,
  paymentMethod,
  onPaymentMethodChange,
  onCheckout,
  isProcessing,
  currencySymbol
}) {
  const paymentMethods = [
    { id: 'cash', name: 'Cash', icon: BanknotesIcon, color: 'bg-green-100 text-green-700' },
    { id: 'card', name: 'Card', icon: CreditCardIcon, color: 'bg-blue-100 text-blue-700' },
    { id: 'mobile', name: 'M-Pesa', icon: DevicePhoneMobileIcon, color: 'bg-orange-100 text-orange-700' }
  ];

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col bg-white shadow-xl">
                    {/* Header */}
                    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                      <div className="flex items-start justify-between">
                        <Dialog.Title className="text-lg font-medium text-gray-900">
                          Shopping Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)
                        </Dialog.Title>
                        <div className="ml-3 flex h-7 items-center">
                          <button
                            type="button"
                            className="relative -m-2 p-2 text-gray-400 hover:text-gray-500"
                            onClick={onClose}
                          >
                            <XMarkIcon className="h-6 w-6" />
                          </button>
                        </div>
                      </div>

                      {/* Cart Items */}
                      <div className="mt-8">
                        {cart.length === 0 ? (
                          <div className="text-center py-12">
                            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            <p className="text-gray-500">Your cart is empty</p>
                          </div>
                        ) : (
                          <div className="flow-root">
                            <ul className="-my-6 divide-y divide-gray-200">
                              {cart.map((item) => (
                                <li key={item.id} className="flex py-6">
                                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                    {item.image_url ? (
                                      <img
                                        src={item.image_url}
                                        alt={item.name}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center">
                                        <span className="text-2xl">📦</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="ml-4 flex flex-1 flex-col">
                                    <div>
                                      <div className="flex justify-between text-base font-medium text-gray-900">
                                        <h3>{item.name}</h3>
                                        <p className="ml-4">
                                          {currencySymbol}{(item.price * item.quantity).toFixed(2)}
                                        </p>
                                      </div>
                                      <p className="mt-1 text-sm text-gray-500">
                                        {currencySymbol}{item.price.toFixed(2)} each
                                      </p>
                                    </div>
                                    <div className="flex flex-1 items-end justify-between text-sm">
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                          className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                                        >
                                          <MinusIcon className="h-4 w-4" />
                                        </button>
                                        <span className="w-8 text-center font-medium">
                                          {item.quantity}
                                        </span>
                                        <button
                                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                          className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                                        >
                                          <PlusIcon className="h-4 w-4" />
                                        </button>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => onRemoveItem(item.id)}
                                        className="font-medium text-red-600 hover:text-red-500"
                                      >
                                        <TrashIcon className="h-5 w-5" />
                                      </button>
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer with totals and checkout */}
                    {cart.length > 0 && (
                      <div className="border-t border-gray-200 px-4 py-6 sm:px-6">
                        {/* Totals */}
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-base text-gray-900">
                            <p>Subtotal</p>
                            <p>{currencySymbol}{subtotal.toFixed(2)}</p>
                          </div>
                          <div className="flex justify-between text-base text-gray-900">
                            <p>Tax</p>
                            <p>{currencySymbol}{tax.toFixed(2)}</p>
                          </div>
                          <div className="flex justify-between text-lg font-medium text-gray-900 pt-2 border-t">
                            <p>Total</p>
                            <p>{currencySymbol}{total.toFixed(2)}</p>
                          </div>
                        </div>

                        {/* Payment Method Selection */}
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Payment Method</p>
                          <div className="grid grid-cols-3 gap-2">
                            {paymentMethods.map((method) => (
                              <button
                                key={method.id}
                                onClick={() => onPaymentMethodChange(method.id)}
                                className={`p-3 rounded-lg border-2 transition-all ${
                                  paymentMethod === method.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <method.icon className={`h-6 w-6 mx-auto mb-1 ${
                                  paymentMethod === method.id ? 'text-blue-600' : 'text-gray-600'
                                }`} />
                                <p className={`text-xs font-medium ${
                                  paymentMethod === method.id ? 'text-blue-900' : 'text-gray-700'
                                }`}>
                                  {method.name}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Checkout Button */}
                        <button
                          onClick={onCheckout}
                          disabled={isProcessing}
                          className={`w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white ${
                            isProcessing
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          {isProcessing ? (
                            <>
                              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Processing...
                            </>
                          ) : (
                            `Complete Sale (${currencySymbol}${total.toFixed(2)})`
                          )}
                        </button>

                        {/* Clear Cart */}
                        <button
                          onClick={onClearCart}
                          className="w-full mt-2 text-center text-sm text-gray-600 hover:text-gray-900"
                        >
                          Clear Cart
                        </button>
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}