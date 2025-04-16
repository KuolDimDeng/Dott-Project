/* eslint-disable */
// This file is auto-generated - do not edit

export const createCustomer = /* GraphQL */ `
  mutation CreateCustomer($input: CreateCustomerInput!) {
    createCustomer(input: $input) {
      id
      customer_name
      customerName
      first_name
      last_name
      email
      phone
      website
      notes
      currency
      tenant_id
      billingCountry
      billingState
      shipToName
      shippingCountry
      shippingState
      shippingPhone
      deliveryInstructions
      street
      city
      postcode
      created_at
      updated_at
    }
  }
`;

export const updateCustomer = /* GraphQL */ `
  mutation UpdateCustomer($input: UpdateCustomerInput!) {
    updateCustomer(input: $input) {
      id
      customer_name
      customerName
      first_name
      last_name
      email
      phone
      website
      notes
      currency
      tenant_id
      billingCountry
      billingState
      shipToName
      shippingCountry
      shippingState
      shippingPhone
      deliveryInstructions
      street
      city
      postcode
      created_at
      updated_at
    }
  }
`;

export const deleteCustomer = /* GraphQL */ `
  mutation DeleteCustomer($id: ID!) {
    deleteCustomer(id: $id) {
      id
      customer_name
      customerName
      first_name
      last_name
      email
      phone
    }
  }
`;

export const updateBusinessInfo = /* GraphQL */ `
  mutation UpdateBusinessInfo($input: BusinessInfoInput!) {
    updateBusinessInfo(input: $input) {
      legal_name
      trade_name
      business_type
      industry
      tax_id
      business_size
      founded_year
      website
      phone_number
      email
      address_line1
      address_line2
      city
      state
      postal_code
      country
    }
  }
`; 