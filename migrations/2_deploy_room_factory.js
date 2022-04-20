const RoomFactory = artifacts.require('../contracts/RoomFactory.sol');

module.exports = deployer => {
    deployer.deploy(RoomFactory)

    // (1)
    // deployer.deploy(RoomFactory).then(instance => {
    //     console.log('ABI:', JSON.stringify(instance.abi))
    // })
}