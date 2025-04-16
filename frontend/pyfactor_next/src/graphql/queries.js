/* eslint-disable */
// This file is auto-generated - do not edit

export const getCustomer = /* GraphQL */ `
  query GetCustomer($id: ID!) {
    getCustomer(id: $id) {
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

export const listCustomers = /* GraphQL */ `
  query ListCustomers(
    $filter: CustomerFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listCustomers(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
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
      nextToken
    }
  }
`;

export const getBusinessInfo = /* GraphQL */ `
  query GetBusinessInfo {
    getBusinessInfo {
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