// 오픈제플린의 테스트 환경 불러옴
const {
    accounts,
    contract,
    web3
} = require('@openzeppelin/test-environment')

const {
    // web3js의 BigNumber
    BN,
    constants,
    expectEvent,
    // 트랜잭션이 실패했을 때의 처리
    expectRevert,
} = require('@openzeppelin/test-helpers')

// chai와 Promise 객체의 어셔선에 필요한 플러그인 로드 (chai-as-promised)
// 행위 주도 개발 스타일로 제공되는 인터페이스 should를 사용할 수 있도록 함
const { expect } = require('chai').use(require('chai-as-promised')).should()

// 테스트할 계약 정의
const RoomFactory = contract.fromArtifact('RoomFactory')

// describe => 테스트코드 그루핑
describe('RoomFactory', function () {
    const [factoryOwner, roomOwner1, roomOwner2, roomOwner3] = accounts

    // 각 테스트 하기 전에 실행
    beforeEach(async function () {
        // factoryOwner 계정으로 RoomFactory 계약을 이더리움 네트워크에 배포
        // 모든 it 메서드 전 새로운 계약의 인스턴스가 제공됨
        // new로 계약 인스턴스를 생성하는 것은 truffle에서 제공하는 API
        this.roomFactory = await RoomFactory.new({ from: factoryOwner })
    })

    // 계약의 인스턴스가 있는지 테스트
    it('should exist', function () {
        this.roomFactory.should.exist
    })

    // 채팅방을 만드는지 테스트하는 테스트를 그루핑
    describe('createRoom', function () {
        const amount = web3.utils.toWei('1', 'ether')

        // 방이 만들어 졌는지 테스트
        it('should create a room', async function () {
            // roomOwner1이 amount(1 eth)를 송금하고 createRoom 함수를 실행
            // 트랜잭션 방식으로 호출된 함수는 receipt를 반환
            const { logs } = await this.roomFactory.createRoom({ from: roomOwner1, value: amount })
            // 이벤트 추출
            // 이벤트인자의 값은 event.args.<솔리디티에 정의한 이벤트 인자 이름>으로 얻을 수 있음
            const event = await expectEvent.inLogs(logs, 'RoomCreated')

            // eth 잔액인 BN 타입으로 할당
            const factoryBalance = await web3.eth.getBalance(this.roomFactory.address)
            // createRoom의 결과인 Room 계약 인스턴스의 이더 잔액이 BN 타입으로 하당
            const roomBalance = await web3.eth.getBalance(event.args._room)

            // 어셔션
            // roomFactory는 payable한 계약의 인스턴스 => 계약 주소로 송금할 수 있음
            // RoomFactory 계약에서 송금액을 저장하지(가지고 있지) 않고
            // 새로 생성한 Room 계약에 전달하는지 테스트
            factoryBalance.should.be.bignumber.equal('0')
            roomBalance.should.be.bignumber.equal(amount)
        })

        it('should emit a RoomCreated evnet', async function () {
            const { logs } = await this.roomFactory.createRoom({ from: roomOwner1, value: amount })
            const event = await expectEvent.inLogs(logs, 'RoomCreated')

            event.args._creator.should.equal(roomOwner1)
            event.args._room.should.equal(event.args._room)
            event.args._depositedValue.should.be.bignumber.equal(amount)
        })

        it('can create multiple rooms', async function () {
            const { logs: logs1 } = await this.roomFactory.createRoom({ from: roomOwner1, value: amount })
            const { logs: logs2 } = await this.roomFactory.createRoom({ from: roomOwner2, value: amount })
            const { logs: logs3 } = await this.roomFactory.createRoom({ from: roomOwner3, value: 0 })

            const event1 = await expectEvent.inLogs(logs1, 'RoomCreated')
            const event2 = await expectEvent.inLogs(logs2, 'RoomCreated')
            const event3 = await expectEvent.inLogs(logs3, 'RoomCreated')

            const factoryBalance = await web3.eth.getBalance(this.roomFactory.address)
            const roomBalance1 = await web3.eth.getBalance(event1.args._room)
            const roomBalance2 = await web3.eth.getBalance(event2.args._room)
            const roomBalance3 = await web3.eth.getBalance(event3.args._room)

            factoryBalance.should.be.bignumber.equal('0')
            roomBalance1.should.be.bignumber.equal(amount)
            roomBalance2.should.be.bignumber.equal(amount)
            roomBalance3.should.be.bignumber.equal('0')

        })

        it('can accept an empty deposit', async function () {
            const { logs } = await this.roomFactory.createRoom({ from: roomOwner1, value: web3.utils.toWei('0', 'ether') })
            const event = await expectEvent.inLogs(logs, 'RoomCreated')

            const factoryBalance = await web3.eth.getBalance(this.roomFactory.address)
            const roomBalance = await web3.eth.getBalance(event.args._room)

            factoryBalance.should.be.bignumber.equal('0')
            roomBalance.should.be.bignumber.equal('0')
        })

        it('can pause createRoom', async function () {
            await this.roomFactory.paused({ from: factoryOwner })
            await this.roomFactory.createRoom({ from: roomOwner1, value: amount }).should.be.rejectedWith
        })

        // RoomFactory 계약이 상속한 Pausable 계약 내 멤버변수 paused의 실행권한을 테스트
        it('only the factory owner can pause createRoom', async function () {
            // paused는 계약 소유자만 실행가능
            // 계약의 소유자인 factoryOwner가 paused 함수를 트랜잭션 방식으로 호출하면
            // pROMISE 객체의 처리가 성공한(fulfilled)일 것으로 기대하고 이외에는 실패한(rejected)할 것을 기대
            await this.roomFactory.paused({ from: roomOwner1 })
                .should.be.rejectedWith
            await this.roomFactory.paused({ from: factoryOwner })
                .should.be.fulfilled
        })
    })
})