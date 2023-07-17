# ReverseAuction dApp

## Descripción del proyecto

Esta aplicación descentralizada te permite realizar subastas inversas, donde el ganador es el número más pequeño y no repetido. Hay varias mecánicas, en primer lugar, puedes participar con un número de tu elección o con un número aleatorio. También tienes NFT para realizar modificaciones al número mediante operaciones como suma, resta, división, multiplicación y agregar un decimal.

## Instalación

Para ejecutar los tests, utiliza el siguiente comando:

```shell
npx hardhat test
```

Para la instalación, asegúrate de tener un archivo .env basado en el archivo .env-example. Luego, ejecuta el siguiente comando:

```shell
npx hardhat --network goerli run ./scripts/deploy.js
```

## Video Explicativo

Puedes encontrar un video explicativo de la aplicación en el siguiente enlace: [https://youtu.be/VZyGktOwUNw](https://youtu.be/VZyGktOwUNw)

## Tecnologías

- El proyecto se basa en codigo Solidity para ser usado en blockchains con EVM. Se utilizaron diversos métodos e interesantes de mencionar:
  - Se utilizó el esquema commit-reveal para mantener en secreto los numeros seleccionados de los participantes. [Más información.](https://medium.com/coinmonks/commit-reveal-scheme-in-solidity-c06eba4091bb)
  - Se utilizó una estrategia de paginado para ver las subastas, pues en un momento dado estas pueden ser demasiadas y superar el límite de respuesta y así también mejorar los tiempos. [Más informacion](https://betterprogramming.pub/issues-of-returning-arrays-of-dynamic-size-in-solidity-smart-contracts-dd1e54424235)
  - Se utilizaron métodos complejos para mantener las subastas importantes (las que están en tiempo de participación). Asimismo, para mantener el listo de subastas en la que esta participando determinado usuario.
- Se utilizó un backend para traer información exterior y escuchar eventos, simula el comportamiento de un OpenZeppelin Defender. Así, la creación de numeros aleatorios en subastas de este tipo es bastante justo. De igual forma los modificadores son creados aleatorimente con ciertas probabilidades para hacer el juego mas emocionante.

## Diagramas UML

A continuación, se muestran los diagramas UML utilizados en el proyecto:

- Diagrama de arquitectura:
  * Se utlizó un Front end en React que puede ser visto en: [https://github.com/hans101299/reverse-auction-dApp-frontend](https://github.com/hans101299/reverse-auction-dApp-frontend) .
  * Se utilizó un backend en Express para realizar operaciones off chain con valores aleatorios y para asignar metadata a los NFT creados a demanda, que puede ser visto en: [https://github.com/hans101299/reverse-auction-dApp-backend](https://github.com/hans101299/reverse-auction-dApp-backend).
  * Se realizó en la testnet de goerli. Ya que, así se puede utilizar una wallet safe que representa a los dueños de la aplicación para realizar cuanlquier cambio administrativo.
  <p align="center">
    <img src=https://github.com/hans101299/reverse-auction-dApp-contracts/blob/main/ReadMe%20images/Arquitectura.png?raw=true>
  </p>
- Diagrama de casos de uso:
  * Se tiene como actor al subastador, quien puede crear una subasta y reclamar sus ganancias.
  * Otro actor en el apostador, quien puede participar en una subasta, usar modificadores, revelar su apuesta y reclamar el premio si es ganador.
  * Finalmente existe un actor de socio, quienes administran los parametros de las subastas.
  * Tener un rol no implica no poner tener otro, incluso un subastador puede participar de su propia subasta ya que no implica ninguna desventaja, todos tienen las mismas condiciones.

  <p align="center">
    <img src=https://github.com/hans101299/reverse-auction-dApp-contracts/blob/main/ReadMe%20images/User%20Cases.png?raw=true>
  </p>
- Diagramas de flujo para el subastador:
  <p align="center">
    <img src=https://github.com/hans101299/reverse-auction-dApp-contracts/blob/main/ReadMe%20images/FlowChart%20Auctioneer.png?raw=true>
  </p>
  
- Diagramas de flujo para el apostador:
  <p align="center">
    <img src=https://github.com/hans101299/reverse-auction-dApp-contracts/blob/main/ReadMe%20images/Flowchart%20Bidder.png?raw=true>
  </p>

## Contacto

Si tienes alguna pregunta o sugerencia, no dudes en ponerte en contacto conmigo:

Hans Mallma Leon
Email: hans.mallma@pucp.edu.pe
