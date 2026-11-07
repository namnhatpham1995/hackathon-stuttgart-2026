# Spec Delta

## ADDED Requirements

### Requirement: Suppliers see and change product visibility on the product page
The product page SHALL show the supplier, outside any collapsed section, whether buyers can find the
product. While it is unlisted, the page SHALL say buyers cannot find it, state that listing shows
only the name, part number and declared profile, and offer one action that lists it. While it is
listed, the page SHALL say so and offer one action that removes it. A new product SHALL start
unlisted.

#### Scenario: New product is unlisted and offers listing
- **WHEN** a supplier creates a product and lands on its page
- **THEN** the page says buyers cannot see the product yet, names what listing shows, and has a "List for buyers" button without opening any collapsed section
- **AND** no buyer finds the product in the catalog or the supplier directory

#### Scenario: Supplier lists the product from its page
- **WHEN** the supplier clicks "List for buyers"
- **THEN** the page shows "Listed for buyers" with a "Remove from directory" action
- **AND** a buyer signed in to another account finds the product in the catalog after reloading

#### Scenario: Supplier removes the listing
- **WHEN** the supplier clicks "Remove from directory" on a listed product
- **THEN** the page shows it as not visible to buyers again and buyers no longer find it

#### Scenario: Visibility survives a reload
- **WHEN** the supplier lists a product and reloads its page
- **THEN** the page still shows it as listed

#### Scenario: Another user cannot change the listing
- **WHEN** a signed-in user sends the list action for a product they do not own
- **THEN** the product's visibility is unchanged and the user gets "Product not found"

### Requirement: The supplier's product list shows visibility
The supplier's product list SHALL show, for every product, whether it is listed for buyers or not
listed, at every screen width.

#### Scenario: Mixed products
- **WHEN** a supplier with one listed and one unlisted product opens the product list
- **THEN** the listed product reads "Listed" and the other reads "Not listed", on a phone and on a desktop

### Requirement: The product page does not imply a buyer request that does not exist
The product page SHALL NOT name a requesting buyer unless a connection with that buyer exists for
the product.

#### Scenario: Product with no connection
- **WHEN** a supplier opens a product that no buyer has connected to
- **THEN** no "Requested by" buyer name appears on the page
