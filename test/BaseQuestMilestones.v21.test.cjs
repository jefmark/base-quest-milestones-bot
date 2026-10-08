const assert = require('node:assert/strict');
const hre = require('hardhat');

async function expectRevert(promise, contains) {
  let caught = null;
  try {
    const result = await promise;
    if (result?.wait) await result.wait();
  } catch (err) {
    caught = err;
  }
  assert.ok(caught, `Expected revert containing ${contains}`);
  const text = String(caught.shortMessage || caught.message || caught);
  assert.ok(text.includes(contains), `Expected "${contains}" in revert, got: ${text}`);
}

async function increase(seconds) {
  await hre.network.provider.send('evm_increaseTime', [seconds]);
  await hre.network.provider.send('evm_mine');
}

describe('BaseQuestMilestones V21 verified-run lifecycle', function () {
  let owner;
  let player;
  let contract;

  beforeEach(async function () {
    [owner, player] = await hre.ethers.getSigners();
    const Factory = await hre.ethers.getContractFactory('BaseQuestMilestones');
    contract = await Factory.deploy(owner.address, 'https://example.invalid/metadata/');
    await contract.waitForDeployment();
    await (await contract.setMintCooldown(0)).wait();
  });

  it('rejects minting when no on-chain run was started', async function () {
    await expectRevert(
      contract.connect(player).mintMilestone(1, 1200, 20, 1),
      'NO_ACTIVE_RUN'
    );
  });

  it('creates a run session and enforces chain time before mint', async function () {
    await (await contract.connect(player).startRun(1)).wait();
    const run = await contract.getActiveRun(player.address);
    assert.equal(run.active, true);
    assert.equal(Number(run.milestone), 1);
    assert.equal(Number(run.nonce), 1);
    assert.match(String(run.challenge), /^0x[0-9a-f]{64}$/i);

    await expectRevert(
      contract.connect(player).mintMilestone(1, 1200, 20, 1),
      'RUN_TOO_FAST'
    );

    await increase(20);
    await (await contract.connect(player).mintMilestone(1, 1200, 20, 1)).wait();
    assert.equal(await contract.hasMintedMilestone(player.address, 1), true);
    const consumed = await contract.getActiveRun(player.address);
    assert.equal(consumed.active, false);
  });

  it('enforces sequential milestones at run start', async function () {
    await expectRevert(contract.connect(player).startRun(2), 'PREVIOUS_MILESTONE_REQUIRED');

    await (await contract.connect(player).startRun(1)).wait();
    await increase(20);
    await (await contract.connect(player).mintMilestone(1, 1200, 20, 1)).wait();
    await (await contract.connect(player).startRun(2)).wait();

    const run = await contract.getActiveRun(player.address);
    assert.equal(Number(run.milestone), 2);
    assert.equal(Number(run.nonce), 2);
  });

  it('blocks opening the next verified run during mint cooldown', async function () {
    await (await contract.connect(player).startRun(1)).wait();
    await increase(20);
    await (await contract.connect(player).mintMilestone(1, 1200, 20, 1)).wait();
    await (await contract.setMintCooldown(60)).wait();

    await expectRevert(contract.connect(player).startRun(2), 'COOLDOWN');
  });

  it('invalidates an older nonce when a new verified run replaces it', async function () {
    await (await contract.connect(player).startRun(1)).wait();
    await (await contract.connect(player).startRun(1)).wait();
    await increase(20);

    await expectRevert(
      contract.connect(player).mintMilestone(1, 1200, 20, 1),
      'BAD_RUN_NONCE'
    );

    await (await contract.connect(player).mintMilestone(1, 1200, 20, 2)).wait();
    assert.equal(await contract.hasMintedMilestone(player.address, 1), true);
  });

  it('rejects implausible client score rates', async function () {
    await (await contract.connect(player).startRun(1)).wait();
    await increase(20);

    await expectRevert(
      contract.connect(player).mintMilestone(1, 1_000_000, 20, 1),
      'SCORE_RATE_TOO_HIGH'
    );
  });

  it('expires stale verified runs', async function () {
    await (await contract.connect(player).startRun(1)).wait();
    await increase(901);

    await expectRevert(
      contract.connect(player).mintMilestone(1, 1200, 900, 1),
      'RUN_EXPIRED'
    );
  });



  it('cancelled runs cannot be minted', async function () {
    await (await contract.connect(player).startRun(1)).wait();
    await (await contract.connect(player).cancelRun()).wait();
    await increase(20);

    await expectRevert(
      contract.connect(player).mintMilestone(1, 1200, 20, 1),
      'NO_ACTIVE_RUN'
    );
  });

  it('rejects client play time materially ahead of chain time', async function () {
    await (await contract.connect(player).startRun(1)).wait();
    await increase(20);

    await expectRevert(
      contract.connect(player).mintMilestone(1, 1200, 100, 1),
      'CLIENT_TIME_AHEAD'
    );
  });

  it('rejects a claim submitted too long after the reported play duration', async function () {
    await (await contract.connect(player).startRun(1)).wait();
    await increase(200);

    await expectRevert(
      contract.connect(player).mintMilestone(1, 1200, 20, 1),
      'CLAIM_TOO_LATE'
    );
  });

  it('keeps permanent progression and token metadata after a valid mint', async function () {
    await (await contract.connect(player).startRun(1)).wait();
    await increase(20);
    await (await contract.connect(player).mintMilestone(1, 1200, 20, 1)).wait();

    assert.equal(Number(await contract.highestCompletedMilestone(player.address)), 1);
    assert.equal(await contract.tokenURI(1), 'https://example.invalid/metadata/1.json');
    assert.equal(Number(await contract.tokenMilestone(1)), 1);

    await expectRevert(contract.connect(player).startRun(1), 'ALREADY_MINTED');
  });

  it('rejects unsafe owner milestone configuration values', async function () {
    await expectRevert(contract.setMilestone(1, 0, 20, true, 'Rookie Runner'), 'ZERO_SCORE');
    await expectRevert(contract.setMilestone(1, 1200, 0, true, 'Rookie Runner'), 'ZERO_PLAY_TIME');
    await expectRevert(contract.setMilestone(1, 1200, 20, true, ''), 'EMPTY_NAME');
  });

  it('rejects direct native-token transfers', async function () {
    await expectRevert(
      player.sendTransaction({ to: await contract.getAddress(), value: 1n }),
      'NO_NATIVE_TOKEN_ACCEPTED'
    );
  });
});
