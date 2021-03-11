# QRoom v1

### Disclaimer
This version of QRoom is insecure and awful and should not be used. Feel free to poke around in the code and see the mistakes I made while creating it.

### Creating QRoom Data
QRoom data, which is stored on a QR code, should look something like this:

`_RIABC000`

The first 3 characters, `_RI`, represent "room identifier" and must be there for the server to recognize this as a QRoom QR code.
The next 3, `ABC`, denote the building, and the last 3, `000`, denote the room of the building.
