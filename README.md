# Inventory Management - Demo

## Requirements

* Node 12 is required by latest Hapi framework
* MySQL database with correct schema. You can use the current remote database that is provided in `database/config.js`(using MySql v5.7), of if you choose to host your own you can import the `.sql` file in `database/db.sql` folder. 

## Setup

To set up the project simply clone it in your environment and run the following:
```
npm i
npm run dev
```

## About the API

### Completed

The following are few highlights worth mentioning:

* Hapi Framework: This was chosen for few reasons, but some of the key ones are `Joi` validation and how `Hapi` works with `Joi`. In addition to handling request and response validation it also allows self-documenting the APIs with Swagger. To view the documentation you can go to http://localhost:3000/documentation
* Responses and requests are validated against with `Joi` but further validation can be enforced to ensure that all input and expected output is valid.
* Default `boom` error types are used in HTTP responses. We can probably create our own error responses that better describe the errors. In certain cases we want to use internal to avoid exposing sensitive data in error messages (for the purpose of this exercise we are not returning internal 500 errors)
* Relational database makes most sense since an inventory problem is relational to begin with. We will be doing plenty of joins so a solution like MySQL or Postgre is suitable.
* Database wrapper in `lib/mysqldb` is my contribution (https://github.com/timhysniu/mysqljs) but is still work in progress. It was intended to make SQL syntax similar to that of MongoDB. This is solely a preference. Any MySQL wrapper can be used.

### Ommitted

The following items were left out of this exercise. While they are important in real life application
I feel that they can be ommited and are not critical in this exercise.

* Transactions: These are important for data integrity. Eg. if adding an inventory item fails, or placing an order fails then everything about that transaction should be rolled back. MySQL supports transactions but these were not included in scope of this exercise.
* Foreign keys: This is good to have for data integrity and are supported by MySQL InnoDB engine
* Order Status Simplications: When orders are placed they are automatically deducted from inventory even though the status is still `new`. When order goes to `cancelled` states, inventory is re-stocked. This is done to simplify the problem, but in practice you may want to deduct inventory when a product is marked as shipped. In addition to this we are deliberately not allowing re-instating orders (changing status from `cancelled` to `new`) since this is a nice to have. If we want to allow this then we would need to use `canPurchaseProducts` to check whether this change is allowed or not.
* Tests can be done using Jest or Lab for Hapi. In real world application this can be tested with 100% coverage but for evaluation purposes this can be done with Swagger or Postman too. Documentation can be found in http://localhost:3000/documentation


## Data Model

The main idea of the exercise is to ensure that all purchases have some history of the products that were
purchased (from suppliers) and products that were sold. In cases when database might not be in a consistent state we can use this history to re-calculate the inventory counts for each product.

When products are initially created we add an initial shipment record in `shipment_product` as if this was
a real shipment from the supplier. Should this be expanded we may want to add other entities (eg. shipment, supplier, etc).

`qty` in `product` table represent the expected inventory after all the orders are shipped. In other
words, quantity at hand may be greater in reality but this is because product(s) may not be shipped yet.
Cancellation of order will re-stock all products in the order and tag that order as `cancelled`


## Testing

To execute behavioral tests we can execute the following:

```
npm run test
```

This will execute tests that make use of `lab` and `code`. We have the ability to inject parameters and payloads to our initialized routes and then have assertions for the responses that we receive. This is a good practice, but we have skipped this section due to some tooling complexities:
* We need proper server initialization and teardown as described here: https://hapi.dev/tutorials/testing/?lang=en_US. We have already done this, but we may want to optimize it so that this happens once in entire experiment.
* Execution of experiments in order. This should be possible using nested experiments but involves some extra steps to set up our data.
* Database clean-up before and after: we have created an endpoint to wipe the data in the database in order to start a clean slate. However, it is not good practice to do this on a shared database. Preferably we should have a separate test database that we can initialize and tear down every time tests are run.


### Testing with cURL

An endpoint has been created to remove all test data from the database. Using curl we can do this:

```
curl -X GET "http://localhost:3000/flushdb" -H  "accept: application/json"
```

#### Create Products and Inventory

We can create a couple of products:

```
curl --location --request POST 'http://127.0.0.1:3000/inventory' \
--header 'Content-Type: application/json' \
--data-raw '{
  "product_id": "062b38bf-d46a-4939-8a42-92368fc22c7d",
  "name": "Starcraft",
  "description": "All time favourite strategy game",
  "price": 20,
  "qty": 100
}'
```

```
curl --location --request POST 'http://127.0.0.1:3000/inventory' \
--header 'Content-Type: application/json' \
--data-raw '{
  "product_id": "418ce0b4-ffab-421a-8a8d-e5e4f08bfb60",
  "name": "Diablo 4",
  "description": "All time favourite Blizzard game",
  "price": 30,
  "qty": 200
}'
```

Then retrieving inventory:
```
curl --location --request GET http://localhost:3000/inventory

[
  {
    "product_id":"062b38bf-d46a-4939-8a42-92368fc22c7d",
    "name":"Starcraft",
    "description":"All time favourite strategy game",
    "price":20,
    "qty":100,
    "created":"2020-09-02T07:43:31.000Z",
    "last_updated":"2020-09-02T07:43:31.000Z"
  },
  {
    "product_id":"418ce0b4-ffab-421a-8a8d-e5e4f08bfb60",
    "name":"Diablo 4",
    "description":"All time favourite Blizzard game",
    "price":30,
    "qty":200,
    "created":"2020-09-02T07:45:19.000Z",
    "last_updated":"2020-09-02T07:45:19.000Z"
  }
]
```

(or by ID):
```
curl --location --request GET http://localhost:3000/inventory/062b38bf-d46a-4939-8a42-92368fc22c7d

....
```

Initiallly there are no orders:

```
curl --location --request GET 'http://127.0.0.1:3000/orders'

[]
```

#### Creating Order and Viewing Inventory

To create an order
```
curl --location --request POST 'http://127.0.0.1:3000/order' \
--header 'Content-Type: application/json' \
--data-raw '{
  "email": "john@smith.com",
  "products": [{
    "product_id": "062b38bf-d46a-4939-8a42-92368fc22c7d",
    "qty": 1.0
  }]
}'
```

We can now get inventory for this product:

```
curl --location --request GET 'http://127.0.0.1:3000/inventory/062b38bf-d46a-4939-8a42-92368fc22c7d' \
--header 'Content-Type: application/json'
{
  "product_id":"062b38bf-d46a-4939-8a42-92368fc22c7d",
  "name":"Starcraft",
  "description":"All time favourite strategy game",
  "price":20,
  "qty":99,
  "created":"2020-09-02T07:43:31.000Z",
  "last_updated":"2020-09-02T07:51:22.000Z"
}
```

#### Cancelling an Order

Finally we can cancel this order:

```
curl --location --request PUT 'http://127.0.0.1:3000/order' \
--header 'Content-Type: application/json' \
--data-raw '{
  "order_id": "da3064b6-3e79-4efc-87ed-e635ba90cbe0",
  "order_status": "cancelled"
}'
```

If retrieve the same inventory request for product ID `062b38bf-d46a-4939-8a42-92368fc22c7d` we will be able to see that `qty` is updated to 100. We are doing this while at the same time keeping a historical record of order `da3064b6-3e79-4efc-87ed-e635ba90cbe0` which is now in cancelled state.

```
{
  "product_id":"062b38bf-d46a-4939-8a42-92368fc22c7d",
  "name":"Starcraft",
  "description":"All time favourite strategy game",
  "price":20,
  "qty":100,
  "created":"2020-09-02T07:43:31.000Z",
  "last_updated":"2020-09-02T13:13:39.000Z"
}
```