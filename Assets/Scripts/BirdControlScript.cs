using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using UnityEngine.SceneManagement;

public class BirdControlScript : MonoBehaviour {

	public float speed = 4.0f;
	public float rotationSpeed = 1.0f;
	public float enemyDistanceRadius = 1.5f;
	public GameObject multiplierObject;
	public static List<BirdControlScript> BirdList = new List<BirdControlScript>();
	public GameObject birdStunParticle;

	private GameObject player;
	public bool alive = false;
	private bool birthing = true;
	public float birthTime = 1.5f;

	private Bounds levelBounds;

	private Sprite defaultBirdSprite;
	public Sprite deadBird;
	public Sprite[] flapBird;

	// Use this for initialization
	void Start () {
		player = GameObject.Find ("plane");
		BirdList.Add (this);
		levelBounds = GameObject.Find ("SkySceneControl").GetComponent<SkySceneControl> ().levelBounds;
		Invoke ("Born", birthTime);
		transform.localScale = new Vector3 (0.2f, 0.2f, 0);
		birdStunParticle.GetComponent<ParticleSystem> ().Stop ();
		defaultBirdSprite = gameObject.GetComponent<SpriteRenderer> ().sprite;
	}

	// Update is called once per frame
	void Update () {
		if (birthing) {
			//can be hit, spread out from other spawned birds
			Vector3 v2 = rule2 (this);
			transform.position += v2 * speed * Time.deltaTime;

			//make size larger each round, until alive and pursuing player
		}
		if (alive) {
			Vector3 vectorToTarget = player.transform.position - transform.position;
			float angle = Mathf.Atan2 (vectorToTarget.y, vectorToTarget.x) * Mathf.Rad2Deg;
			Quaternion q = Quaternion.AngleAxis (angle, Vector3.forward);
			transform.rotation = Quaternion.Slerp (transform.rotation, q, Time.deltaTime * rotationSpeed);

			//get a factor for all of the nearby enemies to apply to the position
			Vector3 v2 = rule2 (this);

			transform.position += (transform.right + v2) * speed * Time.deltaTime;
			if (!levelBounds.Contains (transform.position)) {
				transform.position = levelBounds.ClosestPoint (transform.position);
			}
		}

		if (transform.position.y <= -30) {
			Destroy (gameObject);
		}

		if (alive == true && 90f < transform.eulerAngles.z && transform.eulerAngles.z < 269f) {
			gameObject.GetComponent<SpriteRenderer> ().flipY = true;
		} else {
			gameObject.GetComponent<SpriteRenderer> ().flipY = false;
		}
	}

	void OnDestroy(){
		BirdList.Remove (this);
	}
		
	void OnTriggerEnter2D(Collider2D coll){
		if (coll.gameObject.name == "plane") {
			if (alive) {
				//game over
				SceneManager.LoadScene ("GameOver", LoadSceneMode.Additive);
				Globals.inGame = false;

				coll.gameObject.GetComponent<PlaneControlScript> ().PlaneDeadSound ();
				DestroyEverything ();
				Time.timeScale = 0;
			}
		}
	}

	private Vector3 rule2(BirdControlScript ej)
	{
		Vector2 center = Vector2.zero;

		for(int j = Random.Range(0,1); j < BirdList.Count; j+=2)
		{
			BirdControlScript e = BirdList[j];
			float enemyDistance = Vector2.Distance (ej.transform.position, e.transform.position);
			if (e != ej && enemyDistance <= enemyDistanceRadius) {
				center = center - (Vector2)(e.transform.position - ej.transform.position);
			}
		}

		return center * 0.5f;
	}

	public void hit(Vector3? sourcePoint = null){
		if (sourcePoint == null) {
			sourcePoint = transform.position;
		}
		CancelInvoke ("Born");
		GetComponent<SpriteRenderer> ().sprite = deadBird;
		birdStunParticle.GetComponent<ParticleSystem> ().Play ();
		alive = false;
		Vector2 sourceVector = ((Vector2)transform.position - (Vector2)sourcePoint) * 50f;
		gameObject.GetComponent<Rigidbody2D> ().isKinematic = false;
		gameObject.GetComponent<Collider2D> ().enabled = false;
		gameObject.GetComponent<Rigidbody2D> ().angularVelocity = Random.Range (100f, 400f) * Mathf.Sign( (float)Random.Range (-1, 1));
		gameObject.GetComponent<Rigidbody2D> ().AddForce(sourceVector);
		BirdList.Remove (this);

		Globals.score += 25 * Globals.scoreMultiplier;

		spawnMultiplier ();
	}

	public void spawnMultiplier(){
		Instantiate (multiplierObject, transform.position, transform.rotation);
	}

	public void Born(){
		birthing = false;
		alive = true;
		gameObject.GetComponent<Collider2D> ().enabled = true;
		transform.localScale = new Vector3 (0.5f, 0.5f, 0);
		InitiateFlap ();
	}

	public void DestroyEverything(){
		for (int i = 0; i < BirdList.Count; i++) {
			if (!BirdList [i] == gameObject) {
				BirdList [i].hit();
			}
		}
	}

	IEnumerator Flap(){
		//run through flap animations....
		for (int i = 0; i < flapBird.Length; i++) {
			GetComponent<SpriteRenderer> ().sprite = flapBird [i];
			Debug.Log ("just changed a sprite");
			yield return new WaitForSeconds (.15f);
		}
		GetComponent<SpriteRenderer> ().sprite = defaultBirdSprite;

		Invoke ("InitiateFlap", Random.Range(1f,4f));
	}

	public void InitiateFlap(){
		StartCoroutine( Flap () );
	}
}
