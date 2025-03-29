# Shoe Database Scripts

This directory contains utility scripts for working with the shoe database.

## Available Scripts

### list-shoes.ts

A script that reads the shoe database and outputs information for each shoe in the format:
```
{Brand} {Model}: {description}
```

#### Usage

To run the script:

```bash
npm run db:list-shoes
```

This will:
1. Compile the TypeScript code
2. Connect to the database
3. Retrieve all shoes
4. Output the brand, model, and description for each shoe

#### Example Output

```
Reading shoe database...
Found 3 shoes in the database.

Altra Escalante: A lightweight, zero-drop road running shoe with a responsive midsole.
Xero Prio: A minimalist shoe with a wide toe box and flexible design.
Vivobarefoot Primus Lite: An ultra-thin, flexible barefoot shoe with excellent ground feel.
```

#### Requirements

- Node.js
- Access to the shoe database (make sure your .env file is properly configured)
